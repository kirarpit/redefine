package routes

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"sync"

	"github.com/armon/go-radix"
)

// RadixTrie is a wrapper around go-radix tree with additional functionality for autocomplete
type RadixTrie struct {
	tree  *radix.Tree
	words map[string]bool // For substring search
	mutex sync.RWMutex
}

// NewRadixTrie creates a new RadixTrie for autocomplete
func NewRadixTrie() *RadixTrie {
	return &RadixTrie{
		tree:  radix.New(),
		words: make(map[string]bool),
	}
}

// Insert adds a word to the radix tree
func (rt *RadixTrie) Insert(word string) {
	rt.mutex.Lock()
	defer rt.mutex.Unlock()

	// Convert to lowercase for case-insensitive search
	word = strings.ToLower(strings.TrimSpace(word))
	if word == "" {
		return
	}

	rt.tree.Insert(word, true)
	rt.words[word] = true
}

// LoadFromFile loads words from a file into the radix tree
func (rt *RadixTrie) LoadFromFile(filePath string) error {
	rt.mutex.Lock()
	defer rt.mutex.Unlock()

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
		rt.tree.Insert(word, true)
		rt.words[word] = true
		count++
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading file: %w", err)
	}

	fmt.Printf("Loaded %d words into radix tree\n", count)
	return nil
}

// FindWordsWithPrefix finds all words that start with the given prefix
func (rt *RadixTrie) FindWordsWithPrefix(prefix string, limit int) []string {
	rt.mutex.RLock()
	defer rt.mutex.RUnlock()

	// Convert to lowercase for case-insensitive search
	prefix = strings.ToLower(strings.TrimSpace(prefix))
	if prefix == "" {
		return []string{}
	}

	var results []string

	// WalkPrefix walks the tree and finds all keys with the given prefix
	rt.tree.WalkPrefix(prefix, func(s string, v interface{}) bool {
		results = append(results, s)
		// Return false to continue walking
		return len(results) >= limit
	})

	// Ensure we don't return more than the limit
	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	return results
}

// FindWordsWithSubstring finds all words that contain the given substring
func (rt *RadixTrie) FindWordsWithSubstring(substring string, limit int) []string {
	rt.mutex.RLock()
	defer rt.mutex.RUnlock()

	// Convert to lowercase for case-insensitive search
	substring = strings.ToLower(strings.TrimSpace(substring))
	if substring == "" {
		return []string{}
	}

	var results []string

	// For substring search, we need to iterate through all words
	// Since the word list could be large, we limit our search
	for word := range rt.words {
		if strings.Contains(word, substring) {
			results = append(results, word)
			if limit > 0 && len(results) >= limit {
				break
			}
		}
	}

	return results
}

// FindWords combines prefix and substring search
// It first tries prefix search, and if that doesn't yield enough results,
// falls back to substring search to fill the remainder
func (rt *RadixTrie) FindWords(query string, limit int) []string {
	// First try prefix search
	prefixResults := rt.FindWordsWithPrefix(query, limit)

	// If we got enough results, return them
	if len(prefixResults) >= limit {
		return prefixResults
	}

	// Otherwise, get remaining results from substring search
	remainingLimit := limit - len(prefixResults)
	substringResults := rt.FindWordsWithSubstring(query, remainingLimit)

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
