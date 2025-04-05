package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"redefine/server/models"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Cache for LLM responses
var responseCache = make(map[string]models.ExplanationEntry)

// Message represents a message in the chat API format
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AnthropicRequest represents a request to the Anthropic API
type AnthropicRequest struct {
	Model       string    `json:"model"`
	Messages    []Message `json:"messages"`
	Temperature float64   `json:"temperature"`
}

// AnthropicResponse represents a response from the Anthropic API
type AnthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
}

// ModelGetter is a function type for retrieving LLM models
type ModelGetter func(id string) (*models.LLMModel, error)

// PromptGetter is a function type for retrieving prompt templates
type PromptGetter func() (string, error)

// PromptSaver is a function type for saving prompt templates
type PromptSaver func(template string) error

// SetAPIKey sets environment variables for API keys
func SetAPIKey(model *models.LLMModel) {
	provider := ""
	if strings.Contains(model.ID, "/") {
		provider = strings.Split(model.ID, "/")[0]
	} else {
		provider = model.ID
	}

	provider = strings.ToUpper(provider)

	// Set API key
	os.Setenv(fmt.Sprintf("%s_API_KEY", provider), model.APIKey)

	// Set API endpoint if provided
	if model.APIEndpoint != "" {
		os.Setenv(fmt.Sprintf("%s_API_BASE", provider), model.APIEndpoint)
	}
}

// CallLLM calls the LLM API with the given prompt
func CallLLM(model *models.LLMModel, prompt string) (string, error) {
	SetAPIKey(model)

	// For now we'll implement a simple version that works with Anthropic's API
	// In a production app, you'd want to use a library that supports multiple providers

	// Check if model ID starts with "anthropic/"
	if strings.HasPrefix(model.ID, "anthropic/") {
		return callAnthropicAPI(model, prompt)
	}

	return "", fmt.Errorf("unsupported model provider: %s", model.ID)
}

// callAnthropicAPI calls the Anthropic API
func callAnthropicAPI(model *models.LLMModel, prompt string) (string, error) {
	modelID := strings.TrimPrefix(model.ID, "anthropic/")
	endpoint := "https://api.anthropic.com/v1/messages"
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	// Create request body
	reqBody := AnthropicRequest{
		Model: modelID,
		Messages: []Message{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.1,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", model.APIKey)
	req.Header.Set("Anthropic-Version", "2023-06-01")

	// Send request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var response AnthropicResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Check if response has content
	if len(response.Content) == 0 {
		return "", fmt.Errorf("API response contains no content")
	}

	return response.Content[0].Text, nil
}

// CallLLMAndParseYAML calls the LLM API and parses the YAML response
func CallLLMAndParseYAML(model *models.LLMModel, prompt string) (*models.ExplanationEntry, error) {
	content, err := CallLLM(model, prompt)
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

// GenerateExplanation generates an explanation for the given query
func GenerateExplanation(query string, modelID string, getModel ModelGetter, getPrompt PromptGetter, savePrompt PromptSaver) (*models.ExplanationEntry, error) {
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
	if promptTemplate == "" {
		// Use default template
		promptTemplate, err = LoadPromptTemplateFromFile()
		if err != nil {
			return nil, fmt.Errorf("failed to load default prompt template: %w", err)
		}

		// Save the default template to database
		if err := savePrompt(promptTemplate); err != nil {
			return nil, fmt.Errorf("failed to save default prompt template: %w", err)
		}
	}

	// Replace query in prompt template
	prompt := strings.Replace(promptTemplate, "{query}", query, -1)

	// Check cache
	cacheKey := fmt.Sprintf("%s:%s", modelID, query)
	if entry, ok := responseCache[cacheKey]; ok {
		return &entry, nil
	}

	// Call LLM and parse YAML
	entry, err := CallLLMAndParseYAML(model, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to call LLM: %w", err)
	}

	// Update cache
	responseCache[cacheKey] = *entry

	return entry, nil
}

// LoadPromptTemplate loads the default prompt template from file
func LoadPromptTemplate() (string, error) {
	// For the demo, we'll just return a simple prompt template
	return `Please explain the following in simple terms: {query}
Your response should be in YAML format, with the following structure:
- query: The original query
- type: The type of concept being explained (e.g., "programming concept", "scientific term")
- explanation: A clear, concise explanation
- pronunciation: Phonetic pronunciation if applicable
- related_items: A list of related concepts
- quotes: Notable quotes or examples
- flashcards: A list of flashcards with 'front' and 'back' properties for learning

Wrap your YAML in triple backticks:
` + "```yaml" + `
# Your response here
` + "```" + ``, nil
}

// TestPrompt tests a prompt template
func TestPrompt(model *models.LLMModel, prompt string) (string, error) {
	return CallLLM(model, prompt)
}
