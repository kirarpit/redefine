package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"redefine/server/llm"
	"redefine/server/types"
	"strings"
	"time"
)

// Message represents a message in the Anthropic chat API format
type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AnthropicRequest represents a request to the Anthropic API
type anthropicRequest struct {
	Model       string             `json:"model"`
	Messages    []anthropicMessage `json:"messages"`
	Temperature float64            `json:"temperature"`
	MaxTokens   int                `json:"max_tokens"`
}

// AnthropicResponse represents a response from the Anthropic API
type anthropicResponse struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Role    string `json:"role"`
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
	} `json:"usage"`
}

// AnthropicProvider implements the Provider interface for Anthropic models
type AnthropicProvider struct {
	// No longer stores model-specific information
}

// NewAnthropicProvider creates a new Anthropic provider
func NewAnthropicProvider() (llm.Provider, error) {
	return &AnthropicProvider{}, nil
}

// Name returns the name of the provider
func (p *AnthropicProvider) Name() string {
	return "Anthropic"
}

// Call sends a prompt to the Anthropic API and returns the response
func (p *AnthropicProvider) Call(prompt string, model *types.LLMModel) (string, error) {
	// Extract model name from model ID
	modelName := model.ID
	if strings.Contains(model.ID, "/") {
		modelName = strings.TrimPrefix(model.ID, "anthropic/")
	}

	// Set default endpoint
	endpoint := "https://api.anthropic.com/v1/messages"
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	// Create request body
	reqBody := anthropicRequest{
		Model: modelName,
		Messages: []anthropicMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.01,
		MaxTokens:   2048,
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
	req.Header.Set("x-api-key", model.APIKey)
	req.Header.Set("Anthropic-Version", "2023-06-01")

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
	var response anthropicResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Check if response has content
	if len(response.Content) == 0 {
		return "", fmt.Errorf("API response contains no content")
	}

	// Extract text content from response
	var textContent string
	for _, content := range response.Content {
		if content.Type == "text" {
			textContent += content.Text
		}
	}

	if textContent == "" {
		return "", fmt.Errorf("API response contains no text content")
	}

	return textContent, nil
}

// Register the provider
func init() {
	llm.RegisterProvider("anthropic", NewAnthropicProvider)
}
