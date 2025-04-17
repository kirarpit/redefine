package autosuggest

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
)

const (
	WordLen      = 24
	MaxPrefixLen = 4
)

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
	dataFile    *os.File
	dataMmap    []byte
	prefixIndex map[string][2]int64
	longWords   map[string]string
	mutex       sync.RWMutex
	initialized bool
}

// NewMmapProvider creates a new MmapProvider for autosuggest
func NewMmapProvider() *MmapProvider {
	return &MmapProvider{
		prefixIndex: make(map[string][2]int64),
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

// searchWithPrefix searches for words with the given prefix using the prefix index
func (mp *MmapProvider) searchWithPrefix(prefix string, limit int) []string {
	mp.mutex.RLock()
	defer mp.mutex.RUnlock()

	if !mp.initialized {
		return []string{}
	}

	// Get prefix range from index
	key := prefix[:min(len(prefix), MaxPrefixLen)]
	rng, ok := mp.prefixIndex[key]
	if !ok {
		return []string{}
	}

	start := rng[0] / WordLen
	end := rng[1] / WordLen

	// Binary search for the start position of the prefix
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
	var matches []string
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

		matches = append(matches, word)
		if len(matches) >= limit {
			break
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
	indexFile := filepath.Join(GetTempDir(), "prefix_index.json")
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

	if err := mp.saveJSON(indexFile, prefixIndex); err != nil {
		return err
	}
	if err := mp.saveJSON(longWordsFile, longWords); err != nil {
		return err
	}

	if err := mp.mmapFile(binaryFile); err != nil {
		return err
	}

	if err := mp.loadJSON(indexFile, &mp.prefixIndex); err != nil {
		return err
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

	mp.prefixIndex = make(map[string][2]int64)
	mp.longWords = make(map[string]string)
	mp.initialized = false
}
