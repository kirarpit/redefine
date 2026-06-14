package routes

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"redefine/server/config"

	"github.com/gin-gonic/gin"
)

func setupAnkiRoutes(api *gin.RouterGroup) {
	ankiGroup := api.Group("/anki")
	ankiGroup.POST("/proxy", proxyAnkiConnect)
}

func proxyAnkiConnect(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	targetURL := config.AnkiConnectURL()

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, targetURL, bytes.NewReader(body))
	if err != nil {
		log.Printf("AnkiConnect proxy: failed to create request: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("Failed to connect to AnkiConnect: %v", err)})
		return
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("AnkiConnect proxy: request failed: %v", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("AnkiConnect not available: %v", err)})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read AnkiConnect response"})
		return
	}

	c.Data(resp.StatusCode, "application/json", respBody)
}
