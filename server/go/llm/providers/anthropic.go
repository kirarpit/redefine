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

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicRequest struct {
	Model       string             `json:"model"`
	Messages    []anthropicMessage `json:"messages"`
	Temperature float64            `json:"temperature"`
	MaxTokens   int                `json:"max_tokens"`
}

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

type AnthropicProvider struct {
}

func NewAnthropicProvider() (llm.Provider, error) {
	return &AnthropicProvider{}, nil
}

func (p *AnthropicProvider) Name() string {
	return "Anthropic"
}

func (p *AnthropicProvider) Call(prompt string, model *types.LLMModel) (string, error) {

	modelName := model.ID
	if strings.Contains(model.ID, "/") {
		modelName = strings.TrimPrefix(model.ID, "anthropic/")
	}

	endpoint := "https://api.anthropic.com/v1/messages"
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	reqBody := anthropicRequest{
		Model: modelName,
		Messages: []anthropicMessage{
			{Role: "user", Content: prompt},
		},
		Temperature: 0.01,
		MaxTokens:   2048,
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
	req.Header.Set("x-api-key", model.APIKey)
	req.Header.Set("Anthropic-Version", "2023-06-01")

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

	var response anthropicResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Content) == 0 {
		return "", fmt.Errorf("API response contains no content")
	}

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

func init() {
	llm.RegisterProvider("anthropic", NewAnthropicProvider)
}
