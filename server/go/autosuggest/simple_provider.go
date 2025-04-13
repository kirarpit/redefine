package autosuggest

import (
	"bufio"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
)

// SimpleProvider is a basic implementation of Provider that uses less memory
// It stores a limited set of words in a simple slice for suggestions
type SimpleProvider struct {
	words       []string
	mutex       sync.RWMutex
	maxWords    int  // Maximum number of words to store
	initialized bool // Whether the provider has been initialized
}

// NewSimpleProvider creates a new SimpleProvider with a specified maximum word count
func NewSimpleProvider(maxWords int) *SimpleProvider {
	if maxWords <= 0 {
		maxWords = 10000 // Default to 10K words if invalid value provided
	}
	return &SimpleProvider{
		words:       make([]string, 0, maxWords),
		maxWords:    maxWords,
		initialized: false,
	}
}

// FindSuggestions implements the Provider interface
func (sp *SimpleProvider) FindSuggestions(query string, limit int) []string {
	sp.mutex.RLock()
	defer sp.mutex.RUnlock()

	if !sp.initialized || query == "" {
		return []string{}
	}

	// Convert query to lowercase for case-insensitive search
	query = strings.ToLower(strings.TrimSpace(query))

	// Find matches
	var results []string
	for _, word := range sp.words {
		// First check if it starts with the query (prefix match)
		if strings.HasPrefix(word, query) {
			results = append(results, word)
			if len(results) >= limit {
				break
			}
		}
	}

	// If we don't have enough results, look for substring matches
	if len(results) < limit {
		for _, word := range sp.words {
			// Skip words that are already in results
			alreadyIncluded := false
			for _, result := range results {
				if word == result {
					alreadyIncluded = true
					break
				}
			}

			if !alreadyIncluded && strings.Contains(word, query) {
				results = append(results, word)
				if len(results) >= limit {
					break
				}
			}
		}
	}

	return results
}

// LoadData implements the Provider interface
func (sp *SimpleProvider) LoadData(source string) error {
	// Determine if the source is a file or URL
	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		return sp.loadFromURL(source)
	}
	return sp.loadFromFile(source)
}

// loadFromFile loads words from a file
func (sp *SimpleProvider) loadFromFile(filePath string) error {
	sp.mutex.Lock()
	defer sp.mutex.Unlock()

	// Clear existing words
	sp.words = make([]string, 0, sp.maxWords)

	file, err := os.Open(filePath)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	// Read words from the file
	scanner := bufio.NewScanner(file)
	count := 0

	for scanner.Scan() && count < sp.maxWords {
		word := strings.TrimSpace(scanner.Text())
		if word == "" {
			continue
		}

		// Convert to lowercase for case-insensitive search
		word = strings.ToLower(word)
		sp.words = append(sp.words, word)
		count++
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading from file: %w", err)
	}

	sp.initialized = true
	fmt.Printf("Loaded %d words into simple provider (max: %d)\n", count, sp.maxWords)
	return nil
}

// loadFromURL loads words from a URL
func (sp *SimpleProvider) loadFromURL(source string) error {
	sp.mutex.Lock()
	defer sp.mutex.Unlock()

	// Clear existing words
	sp.words = make([]string, 0, sp.maxWords)

	// Get the data from URL
	resp, err := http.Get(source)
	if err != nil {
		return fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	// Read words from the response body
	scanner := bufio.NewScanner(resp.Body)
	count := 0

	for scanner.Scan() && count < sp.maxWords {
		word := strings.TrimSpace(scanner.Text())
		if word == "" {
			continue
		}

		// Convert to lowercase for case-insensitive search
		word = strings.ToLower(word)
		sp.words = append(sp.words, word)
		count++
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading from URL: %w", err)
	}

	sp.initialized = true
	fmt.Printf("Loaded %d words into simple provider (max: %d)\n", count, sp.maxWords)
	return nil
}
