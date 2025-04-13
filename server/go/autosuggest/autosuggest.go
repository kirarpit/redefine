package autosuggest

import (
	"fmt"
	"redefine/server/types"
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

// NewProvider creates a new autosuggest provider based on the provider type
// This is a factory function that returns a concrete implementation of the interface
func NewProvider(providerType string) (Provider, error) {
	switch providerType {
	case "radix":
		return NewRadixProvider(), nil
	case "simple":
		// Default to 10,000 words for the simple provider
		return NewSimpleProvider(10000), nil
	case "simple-small":
		// A smaller version with only 1,000 words
		return NewSimpleProvider(1000), nil
	case "mmap":
		// Our new memory-mapped provider for low RAM usage
		return NewMmapProvider(), nil
	// Add more implementations here as needed:
	// case "database":
	//    return NewDatabaseProvider(...), nil
	// case "external_api":
	//    return NewExternalAPIProvider(...), nil
	default:
		// If an invalid provider type is specified, return an error
		if providerType != "" {
			return nil, fmt.Errorf("unsupported autosuggest provider type: %s", providerType)
		}

		// Default to RadixProvider as it's the current implementation
		return NewRadixProvider(), nil
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
