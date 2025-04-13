package autosuggest

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
)

const (
	// WordLen is the fixed length of each word in the binary data file
	WordLen = 24
	// TempDir is the directory where temporary files will be stored
	TempDir = "/tmp/redefine-autosuggest"
)

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

	// Need at least 2 characters for the prefix index
	if len(query) < 2 {
		return mp.linearScan(query, limit)
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
	key := prefix[:2]
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

// linearScan performs a linear scan for words starting with the prefix
// Used when the prefix is too short for the index (<2 chars)
func (mp *MmapProvider) linearScan(prefix string, limit int) []string {
	mp.mutex.RLock()
	defer mp.mutex.RUnlock()

	if !mp.initialized {
		return []string{}
	}

	var matches []string
	wordCount := int64(len(mp.dataMmap)) / WordLen

	for i := int64(0); i < wordCount; i++ {
		word := mp.getWordAt(i)

		// Handle exact match for single character words
		if len(prefix) == 1 && len(word) == 1 && word == prefix {
			matches = append(matches, word)
			if len(matches) >= limit {
				break
			}
			continue
		}

		if strings.HasPrefix(word, prefix) {
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

	// Extract the word from the memory mapped file
	buf := mp.dataMmap[start:end]

	// Trim any trailing zeros or spaces
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
func (mp *MmapProvider) LoadData(source string) error {
	// Determine if the source is a file or URL
	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		localFile, err := mp.downloadToLocal(source)
		if err != nil {
			return err
		}
		source = localFile
	}

	// Process the source file to create the binary format and index
	return mp.processSourceFile(source)
}

// downloadToLocal downloads a file from a URL to a local file
func (mp *MmapProvider) downloadToLocal(url string) (string, error) {
	// Create the temp directory if it doesn't exist
	if err := os.MkdirAll(TempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Generate a temporary file path
	tempFile := filepath.Join(TempDir, "words.txt")

	// Download the file
	fmt.Printf("Downloading words from %s to %s\n", url, tempFile)

	// Use the existing code to download and process the file
	// This simplifies the implementation by reusing the SimpleProvider's logic
	simpleProvider := NewSimpleProvider(0) // No max limit
	if err := simpleProvider.LoadData(url); err != nil {
		return "", err
	}

	// Write the words to a local file
	out, err := os.Create(tempFile)
	if err != nil {
		return "", fmt.Errorf("failed to create temp file: %w", err)
	}
	defer out.Close()

	for _, word := range simpleProvider.words {
		if _, err := out.WriteString(word + "\n"); err != nil {
			return "", fmt.Errorf("failed to write to temp file: %w", err)
		}
	}

	return tempFile, nil
}

// processSourceFile processes the source file to create the binary format and index
func (mp *MmapProvider) processSourceFile(sourcePath string) error {
	mp.mutex.Lock()
	defer mp.mutex.Unlock()

	// Clean up any existing resources
	mp.cleanup()

	// Create the temp directory if it doesn't exist
	if err := os.MkdirAll(TempDir, 0755); err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}

	// Generate file paths for the processed data
	binaryFile := filepath.Join(TempDir, "words_fixed.bin")
	indexFile := filepath.Join(TempDir, "prefix_index.json")
	longWordsFile := filepath.Join(TempDir, "long_words.json")

	// Open the source file
	in, err := os.Open(sourcePath)
	if err != nil {
		return fmt.Errorf("failed to open source file: %w", err)
	}
	defer in.Close()

	// Create the binary output file
	out, err := os.Create(binaryFile)
	if err != nil {
		return fmt.Errorf("failed to create binary file: %w", err)
	}
	defer out.Close()

	// Initialize maps for indexing
	prefixIndex := make(map[string][2]int64)
	longWords := make(map[string]string)

	// Process the source file
	scanner := bufio.NewScanner(in)
	var pos int64
	var count int64
	var currentPrefix string
	var start int64

	fmt.Println("Processing words for memory-mapped file...")

	for scanner.Scan() {
		// Get the word and convert to lowercase
		word := strings.ToLower(strings.TrimSpace(scanner.Text()))
		if word == "" {
			continue
		}

		// Pad the word to the fixed length
		padded := padWord(word)

		// Handle long words
		if len(word) > WordLen {
			longWords[padded] = word
		}

		// Update the prefix index for words with at least 2 chars
		if len(word) >= 2 {
			prefix := word[:2]
			if prefix != currentPrefix {
				if currentPrefix != "" {
					prefixIndex[currentPrefix] = [2]int64{start, pos}
				}
				currentPrefix = prefix
				start = pos
			}
		}

		// Write the padded word to the binary file
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
		return fmt.Errorf("error reading source file: %w", err)
	}

	// Save the index and long words map to JSON files
	if err := mp.saveJSON(indexFile, prefixIndex); err != nil {
		return err
	}

	if err := mp.saveJSON(longWordsFile, longWords); err != nil {
		return err
	}

	// Memory map the binary file
	if err := mp.mmapFile(binaryFile); err != nil {
		return err
	}

	// Load the index and long words map
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
