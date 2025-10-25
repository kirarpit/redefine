package types

type FlashcardItem struct {
	Front string `json:"front" yaml:"front"`
	Back  string `json:"back" yaml:"back"`
	Type  string `json:"type" yaml:"type"`
}

type ExplanationEntry struct {
	Query         string          `json:"query" yaml:"query"`
	Type          string          `json:"type" yaml:"type"`
	Explanation   string          `json:"explanation" yaml:"explanation"`
	Pronunciation string          `json:"pronunciation" yaml:"pronunciation"`
	RelatedItems  []string        `json:"related_items,omitempty" yaml:"related_items,omitempty"`
	Quotes        []string        `json:"quotes,omitempty" yaml:"quotes,omitempty"`
	Flashcards    []FlashcardItem `json:"flashcards,omitempty" yaml:"flashcards,omitempty"`
}

type Flashcard struct {
	Front      string `json:"front"`
	Back       string `json:"back"`
	Query      string `json:"query"`
	ExportedAt string `json:"exportedAt"`
}

type LLMModel struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	APIKey      string `json:"apiKey"`
	APIEndpoint string `json:"apiEndpoint,omitempty"`
}

type PromptTemplate struct {
	Template string `json:"template"`
	Type     string `json:"type,omitempty"`
}

type AutosuggestResponse struct {
	Suggestions []string `json:"suggestions"`
}

type SearchResponse struct {
	Entry ExplanationEntry `json:"entry"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
