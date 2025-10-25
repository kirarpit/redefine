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

type RadixProvider struct {
	tree  *radix.Tree
	words map[string]bool
	mutex sync.RWMutex
}

func NewRadixProvider() *RadixProvider {
	return &RadixProvider{
		tree:  radix.New(),
		words: make(map[string]bool),
	}
}

func (rp *RadixProvider) Insert(word string) {
	rp.mutex.Lock()
	defer rp.mutex.Unlock()

	word = strings.ToLower(strings.TrimSpace(word))
	if word == "" {
		return
	}

	rp.tree.Insert(word, true)
	rp.words[word] = true
}

func (rp *RadixProvider) FindSuggestions(query string, limit int) []string {
	return rp.findWords(query, limit)
}

func (rp *RadixProvider) LoadData(source string) error {

	if strings.HasPrefix(source, "http://") || strings.HasPrefix(source, "https://") {
		return rp.loadFromURL(source)
	}
	return rp.loadFromFile(source)
}

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

func (rp *RadixProvider) loadFromURL(url string) error {
	rp.mutex.Lock()
	defer rp.mutex.Unlock()

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to fetch URL: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	scanner := bufio.NewScanner(resp.Body)
	count := 0

	for scanner.Scan() {
		word := strings.TrimSpace(scanner.Text())
		if word == "" {
			continue
		}

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

func (rp *RadixProvider) findWordsWithPrefix(prefix string, limit int) []string {
	rp.mutex.RLock()
	defer rp.mutex.RUnlock()

	prefix = strings.ToLower(strings.TrimSpace(prefix))
	if prefix == "" {
		return []string{}
	}

	var results []string

	rp.tree.WalkPrefix(prefix, func(s string, v interface{}) bool {
		results = append(results, s)

		return len(results) >= limit
	})

	if limit > 0 && len(results) > limit {
		results = results[:limit]
	}

	return results
}

func (rp *RadixProvider) findWordsWithSubstring(substring string, limit int) []string {
	rp.mutex.RLock()
	defer rp.mutex.RUnlock()

	substring = strings.ToLower(strings.TrimSpace(substring))
	if substring == "" {
		return []string{}
	}

	var results []string

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

func (rp *RadixProvider) findWords(query string, limit int) []string {

	prefixResults := rp.findWordsWithPrefix(query, limit)

	if len(prefixResults) >= limit {
		return prefixResults
	}

	remainingLimit := limit - len(prefixResults)
	substringResults := rp.findWordsWithSubstring(query, remainingLimit)

	resultMap := make(map[string]bool)
	for _, word := range prefixResults {
		resultMap[word] = true
	}

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
