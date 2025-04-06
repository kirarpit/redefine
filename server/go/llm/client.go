package llm

import (
	"fmt"
	"redefine/server/types"
	"strings"

	"gopkg.in/yaml.v3"
)

// Cache for LLM responses
var responseCache = make(map[string]types.ExplanationEntry)

// Client provides a unified interface for interacting with LLM providers
type Client struct {
	model    *types.LLMModel
	provider Provider
}

// NewClient creates a new LLM client for the given model
func NewClient(model *types.LLMModel) (*Client, error) {
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
	// Call the provider with the prompt and model
	return c.provider.Call(prompt, c.model)
}

func extractYAML(content string) string {
	parts := strings.SplitN(content, "```yaml", 2)
	if len(parts) < 2 {
		return ""
	}
	parts = strings.SplitN(parts[1], "```", 2)
	if len(parts) < 2 {
		return ""
	}
	return strings.TrimSpace(parts[0])
}

// CallAndParseYAML calls the LLM and parses the YAML response
func (c *Client) CallAndParseYAML(prompt string) (*types.ExplanationEntry, error) {
	content, err := c.Call(prompt)
	if err != nil {
		return nil, err
	}

	// Extract YAML content between ```yaml and ```
	yamlContent := extractYAML(content)
	if yamlContent == "" {
		yamlContent = content
	}

	// Parse YAML
	var entry types.ExplanationEntry
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
		entry.Flashcards = []types.FlashcardItem{}
	}

	return &entry, nil
}

// GenerateExplanation generates an explanation for the given query
func GenerateExplanation(query string, modelID string, getModel ModelGetter, getPrompt PromptGetter) (*types.ExplanationEntry, error) {
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

// ModelGetter is a function type for retrieving LLM models
type ModelGetter func(id string) (*types.LLMModel, error)

// PromptGetter is a function type for retrieving prompt templates
type PromptGetter func() (string, error)

// TestPrompt tests a prompt template with the given model
func TestPrompt(model *types.LLMModel, prompt string, processYAML bool) (string, error) {
	client, err := NewClient(model)
	if err != nil {
		return "", fmt.Errorf("failed to create LLM client: %w", err)
	}

	response, err := client.Call(prompt)
	if err != nil {
		return "", fmt.Errorf("failed to call LLM: %w", err)
	}

	// Process YAML if requested
	if processYAML {
		// Extract YAML content
		yamlContent := extractYAML(response)
		if yamlContent == "" {
			yamlContent = response
		}

		// Try to parse YAML to verify it's valid
		var entry types.ExplanationEntry
		if err := yaml.Unmarshal([]byte(yamlContent), &entry); err != nil {
			return response, fmt.Errorf("YAML parsing error: %v\nYAML content: %s", err, yamlContent)
		}
	}

	return response, nil
}
