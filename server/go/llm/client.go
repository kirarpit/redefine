package llm

import (
	"fmt"
	"redefine/server/models"
	"strings"

	"gopkg.in/yaml.v3"
)

// Cache for LLM responses
var responseCache = make(map[string]models.ExplanationEntry)

// Client provides a unified interface for interacting with LLM providers
type Client struct {
	model    *models.LLMModel
	provider Provider
}

// NewClient creates a new LLM client for the given model
func NewClient(model *models.LLMModel) (*Client, error) {
	// Get provider for the model
	provider, err := GetProvider(model)
	if err != nil {
		return nil, err
	}

	return &Client{
		model:    model,
		provider: provider,
	}, nil
}

// Call sends a prompt to the LLM and returns the response
func (c *Client) Call(prompt string) (string, error) {
	return c.provider.Call(prompt)
}

// CallAndParseYAML calls the LLM and parses the YAML response
func (c *Client) CallAndParseYAML(prompt string) (*models.ExplanationEntry, error) {
	content, err := c.Call(prompt)
	if err != nil {
		return nil, err
	}

	// Extract YAML content between ```yaml and ```
	yamlContent := extractYAML(content)
	if yamlContent == "" {
		return nil, fmt.Errorf("failed to extract YAML from response")
	}

	// Parse YAML
	var entry models.ExplanationEntry
	if err := yaml.Unmarshal([]byte(yamlContent), &entry); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

	// Ensure fields are initialized
	if entry.RelatedItems == nil {
		entry.RelatedItems = []string{}
	}
	if entry.Quotes == nil {
		entry.Quotes = []string{}
	}
	if entry.Flashcards == nil {
		entry.Flashcards = []models.FlashcardItem{}
	}

	return &entry, nil
}

// PromptSaver is a function type for saving prompt templates
type PromptSaver func(template string) error

// GenerateExplanation generates an explanation for the given query
func GenerateExplanation(query string, modelID string, getModel ModelGetter, getPrompt PromptGetter) (*models.ExplanationEntry, error) {
	// Get model from database
	model, err := getModel(modelID)
	if err != nil {
		return nil, fmt.Errorf("failed to get model: %w", err)
	}
	if model == nil {
		return nil, fmt.Errorf("model with ID %s not found", modelID)
	}

	// Get prompt template
	promptTemplate, err := getPrompt()
	if err != nil {
		return nil, fmt.Errorf("failed to get prompt template: %w", err)
	}

	// Replace query in prompt template
	prompt := strings.Replace(promptTemplate, "{query}", query, -1)

	// Check cache
	cacheKey := fmt.Sprintf("%s:%s", modelID, prompt)
	if entry, ok := responseCache[cacheKey]; ok {
		return &entry, nil
	}

	// Create client
	client, err := NewClient(model)
	if err != nil {
		return nil, fmt.Errorf("failed to create LLM client: %w", err)
	}

	// Call LLM and parse YAML
	entry, err := client.CallAndParseYAML(prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM: %w", err)
	}

	// Update cache
	responseCache[cacheKey] = *entry

	return entry, nil
}

// extractYAML extracts YAML content from between ```yaml and ``` tags
func extractYAML(content string) string {
	// Find start of YAML
	startIndex := strings.Index(content, "```yaml")
	if startIndex == -1 {
		// Try without the yaml tag
		startIndex = strings.Index(content, "```")
		if startIndex == -1 {
			return ""
		}
	}

	// Find end of the yaml tag
	yamlTagEnd := strings.Index(content[startIndex:], "\n")
	if yamlTagEnd == -1 {
		return ""
	}

	// Adjust the start index to be after the yaml tag and newline
	startIndex = startIndex + yamlTagEnd + 1

	// Find end of YAML
	endIndex := strings.Index(content[startIndex:], "```")
	if endIndex == -1 {
		return ""
	}

	// Extract YAML content
	yamlContent := content[startIndex : startIndex+endIndex]
	return strings.TrimSpace(yamlContent)
}

// ModelGetter is a function type for retrieving LLM models
type ModelGetter func(id string) (*models.LLMModel, error)

// PromptGetter is a function type for retrieving prompt templates
type PromptGetter func() (string, error)

// TestPrompt tests a prompt template with the given model
func TestPrompt(model *models.LLMModel, prompt string) (string, error) {
	client, err := NewClient(model)
	if err != nil {
		return "", fmt.Errorf("failed to create LLM client: %w", err)
	}

	return client.Call(prompt)
}
