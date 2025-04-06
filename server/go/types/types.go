package types

// FlashcardItem represents an individual flashcard within an explanation
type FlashcardItem struct {
	Front string `json:"front" yaml:"front"`
	Back  string `json:"back" yaml:"back"`
}

// ExplanationEntry represents a complete explanation response
type ExplanationEntry struct {
	Query         string          `json:"query" yaml:"query"`
	Type          string          `json:"type" yaml:"type"`
	Explanation   string          `json:"explanation" yaml:"explanation"`
	Pronunciation string          `json:"pronunciation" yaml:"pronunciation"`
	RelatedItems  []string        `json:"related_items,omitempty" yaml:"related_items,omitempty"`
	Quotes        []string        `json:"quotes,omitempty" yaml:"quotes,omitempty"`
	Flashcards    []FlashcardItem `json:"flashcards,omitempty" yaml:"flashcards,omitempty"`
}

// Flashcard represents a saved flashcard in the database
type Flashcard struct {
	Front      string `json:"front"`
	Back       string `json:"back"`
	Query      string `json:"query"`
	ExportedAt string `json:"exportedAt"`
}

// LLMModel represents an LLM model configuration
type LLMModel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	APIKey      string `json:"apiKey"`
	APIEndpoint string `json:"apiEndpoint,omitempty"`
}

// PromptTemplate represents a prompt template
type PromptTemplate struct {
	Template string `json:"template"`
}

// AutosuggestResponse represents the response for autosuggest API
type AutosuggestResponse struct {
	Suggestions []string `json:"suggestions"`
}

// SearchResponse represents the response for search API
type SearchResponse struct {
	Entry ExplanationEntry `json:"entry"`
}

// ErrorResponse represents an API error response
type ErrorResponse struct {
	Error string `json:"error"`
}
