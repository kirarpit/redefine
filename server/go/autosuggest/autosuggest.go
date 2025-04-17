package autosuggest

import (
	"fmt"
	"path/filepath"
	"redefine/server/types"
	"runtime"
)

// Provider is the interface for autosuggest providers
// This allows us to swap out different implementations without changing the API
type Provider interface {
	// FindSuggestions returns a list of suggestions for the given query
	// limit is the maximum number of suggestions to return
	FindSuggestions(query string, limit int) []string

	// LoadData loads data into the suggestion provider
	// The data source is implementation-specific (e.g., URL, file, database)
	LoadData(source string) error
}

// GetDefaultWordsPath returns the path to the default words.txt file in the repository
func GetDefaultWordsPath() string {
	_, filename, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(filename), "data", "words.txt")
}

// NewProvider creates a new autosuggest provider based on the provider type
// This is a factory function that returns a concrete implementation of the interface
func NewProvider(providerType string) (Provider, error) {
	switch providerType {
	case "radix":
		return NewRadixProvider(), nil
	case "mmap":
		return NewMmapProvider(), nil
	default:
		// If an invalid provider type is specified, return an error
		if providerType != "" {
			return nil, fmt.Errorf("unsupported autosuggest provider type: %s", providerType)
		}

		// Default to MmapProvider
		return NewMmapProvider(), nil
	}
}

// HandleRequest is the handler function for autosuggest API requests
func HandleRequest(provider Provider, query string, limit int) types.AutosuggestResponse {
	if query == "" {
		return types.AutosuggestResponse{
			Suggestions: []string{},
		}
	}

	if limit <= 0 {
		limit = 10 // Default limit
	}

	suggestions := provider.FindSuggestions(query, limit)

	return types.AutosuggestResponse{
		Suggestions: suggestions,
	}
}
