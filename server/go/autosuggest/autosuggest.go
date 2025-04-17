package autosuggest

import (
	"fmt"
	"os"
	"path/filepath"
	"redefine/server/types"
)

type Provider interface {
	FindSuggestions(query string, limit int) []string
	LoadData(source string) error
}

func GetDefaultWordsPath() string {
	rootDir, _ := os.Getwd()
	return filepath.Join(rootDir, "autosuggest/data/words.txt")
}

func NewProvider(providerType string) (Provider, error) {
	switch providerType {
	case "radix":
		return NewRadixProvider(), nil
	case "mmap":
		return NewMmapProvider(), nil
	default:
		if providerType != "" {
			return nil, fmt.Errorf("unsupported autosuggest provider type: %s", providerType)
		}
		return NewMmapProvider(), nil
	}
}

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
