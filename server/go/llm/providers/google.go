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

// GeminiMessage represents a message in the Google Gemini API format
type geminiMessage struct {
	Role  string `json:"role"`
	Parts []part `json:"parts"`
}

// Part represents a content part in the Google Gemini API
type part struct {
	Text string `json:"text"`
}

// GeminiRequest represents a request to the Google Gemini API
type geminiRequest struct {
	Contents         []geminiMessage  `json:"contents"`
	GenerationConfig generationConfig `json:"generationConfig"`
}

// GenerationConfig represents configuration parameters for text generation
type generationConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
	TopP            float64 `json:"topP"`
	TopK            int     `json:"topK"`
}

// GeminiResponse represents a response from the Google Gemini API
type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
			Role string `json:"role"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
	PromptFeedback struct {
		BlockReason string `json:"blockReason"`
	} `json:"promptFeedback"`
}

// GeminiProvider implements the Provider interface for Google Gemini models
type GeminiProvider struct {
	// No provider-specific information needed
}

// NewGeminiProvider creates a new Google Gemini provider
func NewGeminiProvider() (llm.Provider, error) {
	return &GeminiProvider{}, nil
}

// Name returns the name of the provider
func (p *GeminiProvider) Name() string {
	return "Gemini"
}

// Call sends a prompt to the Google Gemini API and returns the response
func (p *GeminiProvider) Call(prompt string, model *types.LLMModel) (string, error) {
	// Extract model name from model ID
	modelName := model.ID
	if strings.Contains(model.ID, "/") {
		// Handle both "gemini/" and "google/" prefixes
		if strings.HasPrefix(model.ID, "gemini/") {
			modelName = strings.TrimPrefix(model.ID, "gemini/")
		} else if strings.HasPrefix(model.ID, "google/") {
			modelName = strings.TrimPrefix(model.ID, "google/")
		}
	}

	// Set default endpoint
	// The endpoint format for Gemini API is:
	// https://generativelanguage.googleapis.com/v1/models/MODEL_NAME:generateContent
	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent", modelName)
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

	// Create request body
	reqBody := geminiRequest{
		Contents: []geminiMessage{
			{
				Role: "user",
				Parts: []part{
					{Text: prompt},
				},
			},
		},
		GenerationConfig: generationConfig{
			Temperature:     0.01,
			MaxOutputTokens: 2048,
			TopP:            0.7,
			TopK:            10,
		},
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

	// For Google AI, the API key is passed as a query parameter
	q := req.URL.Query()
	q.Add("key", model.APIKey)
	req.URL.RawQuery = q.Encode()

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
	var response geminiResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	// Check if response has content
	if len(response.Candidates) == 0 {
		return "", fmt.Errorf("API response contains no candidates")
	}

	// Check for content blocking
	if response.PromptFeedback.BlockReason != "" {
		return "", fmt.Errorf("API response blocked: %s", response.PromptFeedback.BlockReason)
	}

	// Extract text content from response
	var textContent string
	for _, part := range response.Candidates[0].Content.Parts {
		textContent += part.Text
	}

	if textContent == "" {
		return "", fmt.Errorf("API response contains no text content")
	}

	return textContent, nil
}

// Register the provider with both "google" and "gemini" prefixes
func init() {
	// Register with both prefixes to support both conventions
	llm.RegisterProvider("google", NewGeminiProvider)
	llm.RegisterProvider("gemini", NewGeminiProvider)
}
