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
	MaxPrefixLen = 2
)

type IndexRecord struct {
	Prefix     string
	Start, End uint64
}

func GetTempDir() string {
	if os.Getenv("GIN_MODE") == "release" {
		return "/data/autosuggest/mmap"
	}
	return "/tmp/redefine-autosuggest"
}

type MmapProvider struct {
	dataFile     *os.File
	dataMmap     []byte
	indexData    []byte
	indexOffsets []int
	longWords    map[string]string
	mutex        sync.RWMutex
	initialized  bool
}

func NewMmapProvider() *MmapProvider {
	return &MmapProvider{
		longWords:   make(map[string]string),
		initialized: false,
	}
}

func (mp *MmapProvider) FindSuggestions(query string, limit int) []string {

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" || len(mp.dataMmap) == 0 || !mp.initialized {
		return []string{}
	}

	return mp.searchWithPrefix(query, limit)
}

func (mp *MmapProvider) searchWithPrefix(prefix string, limit int) []string {
	mp.mutex.RLock()
	defer mp.mutex.RUnlock()

	if !mp.initialized {
		return []string{}
	}

	searchPrefix := prefix[:min(len(prefix), MaxPrefixLen)]

	rec, err := mp.queryCompressedIndex(searchPrefix)
	if err != nil {
		return []string{}
	}

	seen := make(map[string]bool)
	var matches []string

	start := int64(rec.Start) / WordLen
	end := int64(rec.End) / WordLen

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

	for i := low; i < end; i++ {
		word := mp.getWordAt(i)
		if len(word) < len(prefix) || word[:len(prefix)] != prefix {
			break
		}

		if len(word) > 0 && word[len(word)-1] == '*' {
			longWord, ok := mp.longWords[word]
			if ok {
				word = longWord
			}
		}

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

func (mp *MmapProvider) getWordAt(index int64) string {
	start := index * WordLen
	end := start + WordLen
	if end > int64(len(mp.dataMmap)) {
		end = int64(len(mp.dataMmap))
	}
	buf := mp.dataMmap[start:end]
	return string(bytes.TrimSpace(buf))
}

func padWord(word string) string {
	if len(word) > WordLen {
		return word[:WordLen-1] + "*"
	}
	return fmt.Sprintf("%-*s", WordLen, word)
}

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

	binaryFile := filepath.Join(GetTempDir(), "words_fixed.bin")
	indexFile := filepath.Join(GetTempDir(), "prefix_index.bin")
	longWordsFile := filepath.Join(GetTempDir(), "long_words.json")

	prefixIndex := make(map[string][2]int64)
	longWords := make(map[string]string)

	sortedFile, err := mp.externalSort(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to sort words: %w", err)
	}
	defer os.Remove(sortedFile)

	in, err := os.Open(sortedFile)
	if err != nil {
		return fmt.Errorf("failed to open sorted file: %w", err)
	}
	defer in.Close()

	out, err := os.Create(binaryFile)
	if err != nil {
		return fmt.Errorf("failed to create binary file: %w", err)
	}
	defer out.Close()

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

	if currentPrefix != "" {
		prefixIndex[currentPrefix] = [2]int64{start, pos}
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading from sorted file: %w", err)
	}

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

	mp.indexData, err = os.ReadFile(indexFile)
	if err != nil {
		return fmt.Errorf("failed to read compressed index: %w", err)
	}

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

func (mp *MmapProvider) externalSort(inputFile string) (string, error) {
	sortedFile := filepath.Join(GetTempDir(), "words_sorted.txt")
	cmd := exec.Command("sort", "-o", sortedFile, inputFile)
	err := cmd.Run()
	return sortedFile, err
}

func (mp *MmapProvider) mmapFile(filePath string) error {

	var err error
	mp.dataFile, err = os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open binary file: %w", err)
	}

	fileInfo, err := mp.dataFile.Stat()
	if err != nil {
		mp.dataFile.Close()
		return fmt.Errorf("failed to get file stats: %w", err)
	}

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

	records := make([]IndexRecord, 0, len(idx))
	for k, v := range idx {
		records = append(records, IndexRecord{
			Prefix: k,
			Start:  uint64(v[0]),
			End:    uint64(v[1]),
		})
	}

	sort.Slice(records, func(i, j int) bool {
		return records[i].Prefix < records[j].Prefix
	})

	var buf bytes.Buffer

	err := binary.Write(&buf, binary.LittleEndian, uint64(len(records)))
	if err != nil {
		panic(err)
	}

	for _, rec := range records {

		prefixLen := byte(len(rec.Prefix))
		buf.WriteByte(prefixLen)

		buf.WriteString(rec.Prefix)

		var startBuf [binary.MaxVarintLen64]byte
		n := binary.PutUvarint(startBuf[:], rec.Start)
		buf.Write(startBuf[:n])

		var rangeBuf [binary.MaxVarintLen64]byte
		m := binary.PutUvarint(rangeBuf[:], rec.End-rec.Start)
		buf.Write(rangeBuf[:m])
	}
	return buf.Bytes()
}

func (mp *MmapProvider) readRecord(compData []byte, off int) (rec IndexRecord, next int, err error) {
	if off >= len(compData) {
		return rec, off, fmt.Errorf("offset out of bounds")
	}

	prefixLen := int(compData[off])
	off++
	if off+prefixLen > len(compData) {
		return rec, off, fmt.Errorf("not enough bytes for prefix")
	}
	rec.Prefix = string(compData[off : off+prefixLen])
	off += prefixLen

	start, n := binary.Uvarint(compData[off:])
	if n <= 0 {
		return rec, off, fmt.Errorf("failed reading start offset")
	}
	off += n

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

func (mp *MmapProvider) queryCompressedIndex(searchPrefix string) (IndexRecord, error) {
	if len(mp.indexOffsets) == 0 {
		return IndexRecord{}, fmt.Errorf("offset table not built")
	}

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
