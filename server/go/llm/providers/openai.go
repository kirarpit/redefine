package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"redefine/server/llm"
	"redefine/server/types"
	"regexp"
	"strings"
	"time"
)

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIRequest struct {
	Model               string          `json:"model"`
	Messages            []openAIMessage `json:"messages"`
	Temperature         float64         `json:"temperature,omitempty"`
	MaxTokens           int             `json:"max_tokens,omitempty"`
	MaxCompletionTokens int             `json:"max_completion_tokens,omitempty"`
	TopP                float64         `json:"top_p,omitempty"`
}

type openAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type OpenAIProvider struct {
}

func NewOpenAIProvider() (llm.Provider, error) {
	return &OpenAIProvider{}, nil
}

func (p *OpenAIProvider) Name() string {
	return "OpenAI"
}

// requiresMaxCompletionTokens checks if a model requires max_completion_tokens instead of max_tokens
// Newer OpenAI models (like gpt-5 and models with date suffixes) require max_completion_tokens
func requiresMaxCompletionTokens(modelName string) bool {
	// Check for gpt-5 models
	if strings.Contains(modelName, "gpt-5") {
		return true
	}

	// Check for date suffix pattern (e.g., "2025-08-07")
	datePattern := regexp.MustCompile(`-\d{4}-\d{2}-\d{2}`)
	if datePattern.MatchString(modelName) {
		return true
	}

	return false
}

func (p *OpenAIProvider) Call(prompt string, model *types.LLMModel) (string, error) {

	modelName := model.ID
	if strings.Contains(model.ID, "/") {
		modelName = strings.TrimPrefix(model.ID, "openai/")
	}

	endpoint := "https://api.openai.com/v1/chat/completions"
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	reqBody := openAIRequest{
		Model: modelName,
		Messages: []openAIMessage{
			{Role: "user", Content: prompt},
		},
	}

	// Newer models that require max_completion_tokens also don't support custom temperature/top_p
	// GPT-5 models consume tokens during reasoning, so we need higher limits
	if requiresMaxCompletionTokens(modelName) {
		reqBody.MaxCompletionTokens = 8192 // Increased for GPT-5 models that use tokens for reasoning
		// Don't set Temperature or TopP for newer models - they only support default values
	} else {
		reqBody.MaxTokens = 2048
		reqBody.Temperature = 0.01
		reqBody.TopP = 0.7
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", model.APIKey))

	// GPT-5 models with reasoning capabilities need longer timeouts
	timeout := 30 * time.Second
	if requiresMaxCompletionTokens(modelName) {
		timeout = 120 * time.Second // 2 minutes for GPT-5 models
	}

	client := &http.Client{Timeout: timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	var response openAIResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w, response body: %s", err, string(body))
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("API response contains no choices, response body: %s", string(body))
	}

	content := response.Choices[0].Message.Content
	if content == "" {
		return "", fmt.Errorf("API response contains empty content, response body: %s", string(body))
	}

	return content, nil
}

func init() {
	llm.RegisterProvider("openai", NewOpenAIProvider)
}
