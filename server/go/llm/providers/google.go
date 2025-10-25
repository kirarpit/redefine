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

type geminiMessage struct {
	Role  string `json:"role"`
	Parts []part `json:"parts"`
}

type part struct {
	Text string `json:"text"`
}

type geminiRequest struct {
	Contents         []geminiMessage  `json:"contents"`
	GenerationConfig generationConfig `json:"generationConfig"`
}

type generationConfig struct {
	Temperature     float64 `json:"temperature"`
	MaxOutputTokens int     `json:"maxOutputTokens"`
	TopP            float64 `json:"topP"`
	TopK            int     `json:"topK"`
}

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

type GeminiProvider struct {
}

func NewGeminiProvider() (llm.Provider, error) {
	return &GeminiProvider{}, nil
}

func (p *GeminiProvider) Name() string {
	return "Gemini"
}

func (p *GeminiProvider) Call(prompt string, model *types.LLMModel) (string, error) {

	modelName := model.ID
	if strings.Contains(model.ID, "/") {

		if strings.HasPrefix(model.ID, "gemini/") {
			modelName = strings.TrimPrefix(model.ID, "gemini/")
		} else if strings.HasPrefix(model.ID, "google/") {
			modelName = strings.TrimPrefix(model.ID, "google/")
		}
	}

	endpoint := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/%s:generateContent", modelName)
	if model.APIEndpoint != "" {
		endpoint = model.APIEndpoint
	}

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

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	q := req.URL.Query()
	q.Add("key", model.APIKey)
	req.URL.RawQuery = q.Encode()

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

	var response geminiResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Candidates) == 0 {
		return "", fmt.Errorf("API response contains no candidates")
	}

	if response.PromptFeedback.BlockReason != "" {
		return "", fmt.Errorf("API response blocked: %s", response.PromptFeedback.BlockReason)
	}

	var textContent string
	for _, part := range response.Candidates[0].Content.Parts {
		textContent += part.Text
	}

	if textContent == "" {
		return "", fmt.Errorf("API response contains no text content")
	}

	return textContent, nil
}

func init() {

	llm.RegisterProvider("google", NewGeminiProvider)
	llm.RegisterProvider("gemini", NewGeminiProvider)
}
