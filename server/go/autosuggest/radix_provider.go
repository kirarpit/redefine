package autosuggest

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/armon/go-radix"
)

// RadixProvider is an implementation of Provider using a radix tree
type RadixProvider struct {
	tree  *radix.Tree
	words map[string]bool // For substring search
	mutex sync.RWMutex
}

// NewRadixProvider creates a new RadixProvider for autosuggest
func NewRadixProvider() *RadixProvider {
	return &RadixProvider{
		tree:  radix.New(),
		words: make(map[string]bool),
	}
}

// Insert adds a word to the radix tree
func (rp *RadixProvider) Insert(word string) {
	rp.mutex.Lock()
	defer rp.mutex.Unlock()

	// Convert to lowercase for case-insensitive search
	word = strings.ToLower(strings.TrimSpace(word))
	if word == "" {
		return
	}

	rp.tree.Insert(word, true)
	rp.words[word] = true
}

// FindSuggestions implements the Provider interface
func (rp *RadixProvider) FindSuggestions(query string, limit int) []string {
	return rp.findWords(query, limit)
}

// LoadData implements the Provider interface
func (rp *RadixProvider) LoadData(source string) error {
	// Determine if the source is a file or URL
	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		return rp.loadFromURL(source)
	}
	return rp.loadFromFile(source)
}

// loadFromFile loads words from a file into the radix tree
func (rp *RadixProvider) loadFromFile(filePath string) error {
	rp.mutex.Lock()
	defer rp.mutex.Unlock()

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open word file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	count := 0

	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if word == "" {
			continue
		}

		// Convert to lowercase for case-insensitive search
		word = strings.ToLower(word)
		rp.tree.Insert(word, true)
		rp.words[word] = true
		count++
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	fmt.Printf("Loaded %d words into radix provider\n", count)
	return nil
}

// loadFromURL loads words directly from a URL into the radix tree
func (rp *RadixProvider) loadFromURL(url string) error {
	rp.mutex.Lock()
	defer rp.mutex.Unlock()

	// Get the data
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Read directly from the response body
	scanner := bufio.NewScanner(resp.Body)
	count := 0

	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if word == "" {
			continue
		}

		// Convert to lowercase for case-insensitive search
		word = strings.ToLower(word)
		rp.tree.Insert(word, true)
		rp.words[word] = true
		count++
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading from URL: %w", err)
	}

	fmt.Printf("Loaded %d words into radix provider from URL\n", count)
	return nil
}

// findWordsWithPrefix finds all words that start with the given prefix
func (rp *RadixProvider) findWordsWithPrefix(prefix string, limit int) []string {
	rp.mutex.RLock()
	defer rp.mutex.RUnlock()

	// Convert to lowercase for case-insensitive search
	prefix = strings.ToLower(strings.TrimSpace(prefix))
	if prefix == "" {
		return []string{}
	}

	var results []string

	// WalkPrefix walks the tree and finds all keys with the given prefix
	rp.tree.WalkPrefix(prefix, func(s string, v interface{}) bool {
		results = append(results, s)
		// Return true to stop walking if we've reached the limit
		return len(results) >= limit
	})

	// Ensure we don't return more than the limit
	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	return results
}

// findWordsWithSubstring finds all words that contain the given substring
func (rp *RadixProvider) findWordsWithSubstring(substring string, limit int) []string {
	rp.mutex.RLock()
	defer rp.mutex.RUnlock()

	// Convert to lowercase for case-insensitive search
	substring = strings.ToLower(strings.TrimSpace(substring))
	if substring == "" {
		return []string{}
	}

	var results []string

	// For substring search, we need to iterate through all words
	// Since the word list could be large, we limit our search
	for word := range rp.words {
		if strings.Contains(word, substring) {
			results = append(results, word)
			if limit > 0 && len(results) >= limit {
				break
			}
		}
	}

	return results
}

// findWords combines prefix and substring search
// It first tries prefix search, and if that doesn't yield enough results,
// falls back to substring search to fill the remainder
func (rp *RadixProvider) findWords(query string, limit int) []string {
	// First try prefix search
	prefixResults := rp.findWordsWithPrefix(query, limit)

	// If we got enough results, return them
	if len(prefixResults) >= limit {
		return prefixResults
	}

	// Otherwise, get remaining results from substring search
	remainingLimit := limit - len(prefixResults)
	substringResults := rp.findWordsWithSubstring(query, remainingLimit)

	// Combine results, ensuring no duplicates
	resultMap := make(map[string]bool)
	for _, word := range prefixResults {
		resultMap[word] = true
	}

	// Add substring results that aren't already in the prefix results
	for _, word := range substringResults {
		if !resultMap[word] {
			prefixResults = append(prefixResults, word)
			resultMap[word] = true
			if len(prefixResults) >= limit {
				break
			}
		}
	}

	return prefixResults
}
