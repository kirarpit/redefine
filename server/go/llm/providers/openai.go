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

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIRequest struct {
	Model       string          `json:"model"`
	Messages    []openAIMessage `json:"messages"`
	Temperature float64         `json:"temperature"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	TopP        float64         `json:"top_p,omitempty"`
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
		Temperature: 0.01,
		MaxTokens:   2048,
		TopP:        0.7,
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

	client := &http.Client{Timeout: 30 * time.Second}
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
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("API response contains no choices")
	}

	return response.Choices[0].Message.Content, nil
}

func init() {
	llm.RegisterProvider("openai", NewOpenAIProvider)
}
