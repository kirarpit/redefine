package llm

import (
	"fmt"
	"redefine/server/types"
	"strings"

	"gopkg.in/yaml.v3"
)

var responseCache = make(map[string]types.ExplanationEntry)

type Client struct {
	model    *types.LLMModel
	provider Provider
}

func NewClient(model *types.LLMModel) (*Client, error) {

	provider, err := GetProvider(model)
	if err != nil {
		return nil, err
	}

	return &Client{
		model:    model,
		provider: provider,
	}, nil
}

func (c *Client) Call(prompt string) (string, error) {

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

func (c *Client) CallAndParseYAML(prompt string) (*types.ExplanationEntry, error) {
	content, err := c.Call(prompt)
	if err != nil {
		return nil, err
	}

	yamlContent := extractYAML(content)
	if yamlContent == "" {
		yamlContent = content
	}

	var entry types.ExplanationEntry
	if err := yaml.Unmarshal([]byte(yamlContent), &entry); err != nil {
		return nil, fmt.Errorf("failed to parse YAML: %w", err)
	}

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

func GenerateExplanation(query string, modelID string, getModel ModelGetter, getPrompt PromptGetter, promptType string) (*types.ExplanationEntry, error) {

	model, err := getModel(modelID)
	if err != nil {
		return nil, fmt.Errorf("failed to get model: %w", err)
	}
	if model == nil {
		return nil, fmt.Errorf("model with ID %s not found", modelID)
	}

	promptTemplate, err := getPrompt(promptType)
	if err != nil {
		return nil, fmt.Errorf("failed to get %s prompt template: %w", promptType, err)
	}

	prompt := strings.Replace(promptTemplate, "{query}", query, -1)

	cacheKey := fmt.Sprintf("%s:%s:%s", modelID, promptType, prompt)
	if entry, ok := responseCache[cacheKey]; ok {
		return &entry, nil
	}

	client, err := NewClient(model)
	if err != nil {
		return nil, fmt.Errorf("failed to create LLM client: %w", err)
	}

	entry, err := client.CallAndParseYAML(prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM: %w", err)
	}

	responseCache[cacheKey] = *entry

	return entry, nil
}

type ModelGetter func(id string) (*types.LLMModel, error)

type PromptGetter func(promptType string) (string, error)

func TestPrompt(model *types.LLMModel, prompt string, processYAML bool) (string, error) {
	client, err := NewClient(model)
	if err != nil {
		return "", fmt.Errorf("failed to create LLM client: %w", err)
	}

	response, err := client.Call(prompt)
	if err != nil {
		return "", fmt.Errorf("failed to call LLM: %w", err)
	}

	if processYAML {

		yamlContent := extractYAML(response)
		if yamlContent == "" {
			yamlContent = response
		}

		var entry types.ExplanationEntry
		if err := yaml.Unmarshal([]byte(yamlContent), &entry); err != nil {
			return response, fmt.Errorf("YAML parsing error: %v\nYAML content: %s", err, yamlContent)
		}
	}

	return response, nil
}
