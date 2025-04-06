package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"redefine/server/llm"
	"redefine/server/models"
	"strings"
	"time"
)

// OpenAIMessage represents a message in the OpenAI chat API format
type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// OpenAIRequest represents a request to the OpenAI API
type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
}

// OpenAIResponse represents a response from the OpenAI API
type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// OpenAIProvider implements the Provider interface for OpenAI models
type OpenAIProvider struct {
	// No longer stores model-specific information
}

// NewOpenAIProvider creates a new OpenAI provider
func NewOpenAIProvider() (llm.Provider, error) {
	return &OpenAIProvider{}, nil
}

// Name returns the name of the provider
func (p *OpenAIProvider) Name() string {
	return "OpenAI"
}

// Call sends a prompt to the OpenAI API and returns the response
func (p *OpenAIProvider) Call(prompt string, model *models.LLMModel) (string, error) {
	// Extract model name from model ID
	modelName := model.ID
	if strings.Contains(model.ID, "/") {
		modelName = strings.TrimPrefix(model.ID, "openai/")
	}

	// Set default endpoint
	endpoint := "https://api.openai.com/v1/chat/completions"
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	// Create request body
	reqBody := openAIRequest{
		Model: modelName,
		Messages: []openAIMessage{
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
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", model.APIKey))

	// Send request
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var response openAIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Check if response has content
	if len(response.Choices) == 0 {
		return "", fmt.Errorf("API response contains no choices")
	}

	return response.Choices[0].Message.Content, nil
}

// Register the provider
func init() {
	llm.RegisterProvider("openai", NewOpenAIProvider)
}
