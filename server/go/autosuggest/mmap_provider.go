package autosuggest

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"syscall"
)

const (
	WordLen      = 24
	MaxPrefixLen = 4
)

// IndexRecord represents one prefix index entry.
type IndexRecord struct {
	Prefix     string
	Start, End uint64
}

// GetTempDir returns the appropriate temp directory based on environment
func GetTempDir() string {
	if os.Getenv("GIN_MODE") == "release" {
		return "/data/autosuggest/mmap"
	}
	return "/tmp/redefine-autosuggest"
}

// MmapProvider is an implementation of Provider using memory mapped files
// for low RAM consumption while maintaining fast lookup times
type MmapProvider struct {
	dataFile     *os.File
	dataMmap     []byte
	indexData    []byte // Compressed index data
	indexOffsets []int  // Offset table for the compressed index
	longWords    map[string]string
	mutex        sync.RWMutex
	initialized  bool
}

// NewMmapProvider creates a new MmapProvider for autosuggest
func NewMmapProvider() *MmapProvider {
	return &MmapProvider{
		longWords:   make(map[string]string),
		initialized: false,
	}
}

// FindSuggestions implements the Provider interface
func (mp *MmapProvider) FindSuggestions(query string, limit int) []string {
	// Clean and convert the query
	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" || len(mp.dataMmap) == 0 || !mp.initialized {
		return []string{}
	}

	return mp.searchWithPrefix(query, limit)
}

// searchWithPrefix searches for words with the given prefix using the binary index
func (mp *MmapProvider) searchWithPrefix(prefix string, limit int) []string {
	mp.mutex.RLock()
	defer mp.mutex.RUnlock()

	if !mp.initialized {
		return []string{}
	}

	// Use only up to MaxPrefixLen characters for the search
	searchPrefix := prefix[:min(len(prefix), MaxPrefixLen)]

	// Query the compressed index
	rec, err := mp.queryCompressedIndex(searchPrefix)
	if err != nil {
		return []string{}
	}

	// To avoid duplicates, use a map to track already seen words
	seen := make(map[string]bool)
	var matches []string

	// Calculate the word positions
	start := int64(rec.Start) / WordLen
	end := int64(rec.End) / WordLen

	// Binary search for the start position of the full prefix
	low, high := start, end
	for low < high {
		mid := (low + high) / 2
		word := mp.getWordAt(mid)
		if word < prefix {
			low = mid + 1
		} else {
			high = mid
		}
	}

	// Linear scan from the position found by binary search
	for i := low; i < end; i++ {
		word := mp.getWordAt(i)
		if len(word) < len(prefix) || word[:len(prefix)] != prefix {
			break
		}

		// Handle long words that were truncated
		if len(word) > 0 && word[len(word)-1] == '*' {
			longWord, ok := mp.longWords[word]
			if ok {
				word = longWord
			}
		}

		// Only add the word if we haven't seen it yet
		if !seen[word] {
			matches = append(matches, word)
			seen[word] = true
			if len(matches) >= limit {
				break
			}
		}
	}

	return matches
}

// getWordAt gets the word at the specified index
func (mp *MmapProvider) getWordAt(index int64) string {
	start := index * WordLen
	end := start + WordLen
	if end > int64(len(mp.dataMmap)) {
		end = int64(len(mp.dataMmap))
	}
	buf := mp.dataMmap[start:end]
	return string(bytes.TrimSpace(buf))
}

// padWord pads a word to the fixed length and handles long words
func padWord(word string) string {
	if len(word) > WordLen {
		return word[:WordLen-1] + "*"
	}
	return fmt.Sprintf("%-*s", WordLen, word)
}

// LoadData implements the Provider interface
func (mp *MmapProvider) LoadData(sourcePath string) error {
	mp.mutex.Lock()
	defer mp.mutex.Unlock()

	if _, err := os.Stat(sourcePath); os.IsNotExist(err) {
		return fmt.Errorf("source file does not exist: %s", sourcePath)
	}

	mp.cleanup()
	if err := os.MkdirAll(GetTempDir(), 0755); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Generate file paths for the processed data
	binaryFile := filepath.Join(GetTempDir(), "words_fixed.bin")
	indexFile := filepath.Join(GetTempDir(), "prefix_index.bin")
	longWordsFile := filepath.Join(GetTempDir(), "long_words.json")

	// Initialize maps for indexing
	prefixIndex := make(map[string][2]int64)
	longWords := make(map[string]string)

	// Sort the words lexicographically first (using external sort to minimize memory usage)
	sortedFile, err := mp.externalSort(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to sort words: %w", err)
	}
	defer os.Remove(sortedFile)

	// Open the sorted file
	in, err := os.Open(sortedFile)
	if err != nil {
		return fmt.Errorf("failed to open sorted file: %w", err)
	}
	defer in.Close()

	// Create the binary output file
	out, err := os.Create(binaryFile)
	if err != nil {
		return fmt.Errorf("failed to create binary file: %w", err)
	}
	defer out.Close()

	// Process the sorted words directly from file
	scanner := bufio.NewScanner(in)
	var pos int64
	var count int64
	var currentPrefix string
	var start int64

	fmt.Println("Writing sorted words to memory-mapped file...")

	for scanner.Scan() {
		word := strings.ToLower(strings.TrimSpace(scanner.Text()))
		if word == "" {
			continue
		}

		// For each prefix (from length 1 to n) update the index.
		for l := 1; l <= min(len(word), MaxPrefixLen); l++ {
			pfx := word[:l]
			if rec, ok := prefixIndex[pfx]; ok {
				prefixIndex[pfx] = [2]int64{rec[0], pos + WordLen}
			} else {
				prefixIndex[pfx] = [2]int64{pos, pos + WordLen}
			}
		}

		padded := padWord(word)
		if len(word) > WordLen {
			longWords[padded] = word
		}
		out.WriteString(padded)
		pos += WordLen
		count++
	}

	// Add the last prefix range
	if currentPrefix != "" {
		prefixIndex[currentPrefix] = [2]int64{start, pos}
	}

	// Check for scanner errors
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading from sorted file: %w", err)
	}

	// Compress the prefix index and save it to disk
	compressedIndex := mp.compressIndex(prefixIndex)
	if err := os.WriteFile(indexFile, compressedIndex, 0644); err != nil {
		return fmt.Errorf("failed to write compressed index: %w", err)
	}

	if err := mp.saveJSON(longWordsFile, longWords); err != nil {
		return err
	}

	if err := mp.mmapFile(binaryFile); err != nil {
		return err
	}

	// Load the compressed index
	mp.indexData, err = os.ReadFile(indexFile)
	if err != nil {
		return fmt.Errorf("failed to read compressed index: %w", err)
	}

	// Build the offset table for efficient binary search
	mp.indexOffsets, err = mp.buildOffsetTable(mp.indexData)
	if err != nil {
		return fmt.Errorf("failed to build offset table: %w", err)
	}

	if err := mp.loadJSON(longWordsFile, &mp.longWords); err != nil {
		return err
	}
	mp.initialized = true
	fmt.Printf("Loaded %d words into memory-mapped provider\n", count)
	return nil
}

// externalSort performs an external sort on the input file to minimize memory usage
func (mp *MmapProvider) externalSort(inputFile string) (string, error) {
	sortedFile := filepath.Join(GetTempDir(), "words_sorted.txt")
	cmd := exec.Command("sort", "-o", sortedFile, inputFile)
	err := cmd.Run()
	return sortedFile, err
}

// mmapFile memory maps the binary file
func (mp *MmapProvider) mmapFile(filePath string) error {
	// Open the file for reading
	var err error
	mp.dataFile, err = os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open binary file: %w", err)
	}

	// Get the file size
	fileInfo, err := mp.dataFile.Stat()
	if err != nil {
		mp.dataFile.Close()
		return fmt.Errorf("failed to get file stats: %w", err)
	}

	// Memory map the file
	mp.dataMmap, err = syscall.Mmap(
		int(mp.dataFile.Fd()),
		0,
		int(fileInfo.Size()),
		syscall.PROT_READ,
		syscall.MAP_SHARED,
	)
	if err != nil {
		mp.dataFile.Close()
		return fmt.Errorf("failed to mmap file: %w", err)
	}

	return nil
}

// saveJSON saves data to a JSON file
func (mp *MmapProvider) saveJSON(filePath string, data interface{}) error {
	f, err := os.Create(filePath)
	if err != nil {
		return fmt.Errorf("failed to create JSON file: %w", err)
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	if err := enc.Encode(data); err != nil {
		return fmt.Errorf("failed to encode JSON: %w", err)
	}

	return nil
}

// loadJSON loads data from a JSON file
func (mp *MmapProvider) loadJSON(filePath string, data interface{}) error {
	f, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open JSON file: %w", err)
	}
	defer f.Close()

	if err := json.NewDecoder(f).Decode(data); err != nil {
		return fmt.Errorf("failed to decode JSON: %w", err)
	}

	return nil
}

// compressIndex converts an index map (key → [start, end]) into a compressed byte slice.
// Each entry is stored as:
//
//	[prefix length (1 byte)] [prefix bytes] [start offset as varint] [range length as varint]
func (mp *MmapProvider) compressIndex(idx map[string][2]int64) []byte {
	// Convert the map to a slice for a consistent ordering.
	records := make([]IndexRecord, 0, len(idx))
	for k, v := range idx {
		records = append(records, IndexRecord{
			Prefix: k,
			Start:  uint64(v[0]),
			End:    uint64(v[1]),
		})
	}
	// Sort records by prefix to have a reproducible layout.
	sort.Slice(records, func(i, j int) bool {
		return records[i].Prefix < records[j].Prefix
	})

	var buf bytes.Buffer

	// Write the number of records first (as a fixed 8-byte little endian uint64).
	// This allows you to know how many records are stored when decoding.
	err := binary.Write(&buf, binary.LittleEndian, uint64(len(records)))
	if err != nil {
		panic(err)
	}

	// Encode each record.
	for _, rec := range records {
		// Write a single byte for the length of the prefix.
		prefixLen := byte(len(rec.Prefix))
		buf.WriteByte(prefixLen)
		// Write the prefix bytes.
		buf.WriteString(rec.Prefix)

		// Write the start offset using Uvarint.
		var startBuf [binary.MaxVarintLen64]byte
		n := binary.PutUvarint(startBuf[:], rec.Start)
		buf.Write(startBuf[:n])

		// Write the range length (i.e. rec.End - rec.Start) using Uvarint.
		var rangeBuf [binary.MaxVarintLen64]byte
		m := binary.PutUvarint(rangeBuf[:], rec.End-rec.Start)
		buf.Write(rangeBuf[:m])
	}
	return buf.Bytes()
}

// readRecord reads one record from the compressed index (compData)
// starting at offset "off". It returns the decoded record,
// the next offset in compData (after this record), and an error if any.
func (mp *MmapProvider) readRecord(compData []byte, off int) (rec IndexRecord, next int, err error) {
	if off >= len(compData) {
		return rec, off, fmt.Errorf("offset out of bounds")
	}
	// Read prefix length (1 byte)
	prefixLen := int(compData[off])
	off++
	if off+prefixLen > len(compData) {
		return rec, off, fmt.Errorf("not enough bytes for prefix")
	}
	rec.Prefix = string(compData[off : off+prefixLen])
	off += prefixLen

	// Read start offset encoded as Uvarint.
	start, n := binary.Uvarint(compData[off:])
	if n <= 0 {
		return rec, off, fmt.Errorf("failed reading start offset")
	}
	off += n

	// Read range length (i.e. end - start) encoded as Uvarint.
	rangeLen, m := binary.Uvarint(compData[off:])
	if m <= 0 {
		return rec, off, fmt.Errorf("failed reading range length")
	}
	off += m

	rec.Start = start
	rec.End = start + rangeLen
	return rec, off, nil
}

// buildOffsetTable scans the compressed index and returns a slice of offsets
// (one per record) pointing to the start of each record in compData.
// We assume the first 8 bytes of compData encode the number of records.
func (mp *MmapProvider) buildOffsetTable(compData []byte) ([]int, error) {
	if len(compData) < 8 {
		return nil, fmt.Errorf("data too short for header")
	}
	numRecords := int(binary.LittleEndian.Uint64(compData[:8]))
	offsets := make([]int, 0, numRecords)
	off := 8
	for i := 0; i < numRecords; i++ {
		offsets = append(offsets, off)
		_, next, err := mp.readRecord(compData, off)
		if err != nil {
			return nil, err
		}
		off = next
	}
	return offsets, nil
}

// queryCompressedIndex uses the offset table to perform a binary search on
// the compressed index for a given searchPrefix. It decompresses only the records
// needed to answer the query.
func (mp *MmapProvider) queryCompressedIndex(searchPrefix string) (IndexRecord, error) {
	if len(mp.indexOffsets) == 0 {
		return IndexRecord{}, fmt.Errorf("offset table not built")
	}

	// Binary search for the first record whose prefix is >= searchPrefix.
	low, high := 0, len(mp.indexOffsets)
	for low < high {
		mid := (low + high) / 2
		rec, _, err := mp.readRecord(mp.indexData, mp.indexOffsets[mid])
		if err != nil {
			return IndexRecord{}, err
		}
		if rec.Prefix < searchPrefix {
			low = mid + 1
		} else {
			high = mid
		}
	}

	// Starting from "low", decompress records until the prefix no longer matches.
	var result IndexRecord
	for i := low; i < len(mp.indexOffsets); i++ {
		rec, _, err := mp.readRecord(mp.indexData, mp.indexOffsets[i])
		if err != nil {
			return IndexRecord{}, err
		}
		if strings.HasPrefix(rec.Prefix, searchPrefix) {
			result = rec
			break
		}
	}

	return result, nil
}

// cleanup releases resources used by the provider
func (mp *MmapProvider) cleanup() {
	if mp.dataMmap != nil {
		syscall.Munmap(mp.dataMmap)
		mp.dataMmap = nil
	}

	if mp.dataFile != nil {
		mp.dataFile.Close()
		mp.dataFile = nil
	}

	mp.indexData = nil
	mp.indexOffsets = nil
	mp.longWords = make(map[string]string)
	mp.initialized = false
}
