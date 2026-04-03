package gemini

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const apiBase = "https://generativelanguage.googleapis.com/v1beta"

type Client struct {
	httpClient *http.Client
	apiKey     string
}

func NewClient(apiKey string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		apiKey:     apiKey,
	}
}

func (c *Client) GenerateText(ctx context.Context, prompt string, model string, temperature float32, maxOutputTokens int) (string, error) {
	requestBody := map[string]any{
		"contents": []map[string]any{{
			"parts": []map[string]string{{"text": prompt}},
		}},
		"generationConfig": map[string]any{
			"temperature":     temperature,
			"maxOutputTokens": maxOutputTokens,
		},
	}

	payload, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("marshal request: %w", err)
	}

	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/models/%s:generateContent", apiBase, model),
		bytes.NewReader(payload),
	)
	if err != nil {
		return "", fmt.Errorf("build request: %w", err)
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("x-goog-api-key", c.apiKey)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return "", fmt.Errorf("send request: %w", err)
	}
	defer response.Body.Close()

	var responseBody struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.NewDecoder(response.Body).Decode(&responseBody); err != nil {
		return "", fmt.Errorf("decode response: %w", err)
	}

	if responseBody.Error != nil {
		return "", fmt.Errorf("gemini api error: %s", responseBody.Error.Message)
	}

	if len(responseBody.Candidates) == 0 || len(responseBody.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini returned no text")
	}

	return responseBody.Candidates[0].Content.Parts[0].Text, nil
}
