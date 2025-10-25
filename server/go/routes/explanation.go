package routes

import (
	"log"
	"os"
	"redefine/server/autosuggest"
	"redefine/server/db"
	"redefine/server/llm"
	_ "redefine/server/llm/providers"

	"github.com/gin-gonic/gin"
)

var autosuggestProvider autosuggest.Provider

func init() {

	providerType := os.Getenv("AUTOSUGGEST_PROVIDER")

	var err error
	autosuggestProvider, err = autosuggest.NewProvider(providerType)
	if err != nil {
		log.Printf("Failed to create autosuggest provider: %v. Using default provider.", err)
		autosuggestProvider, _ = autosuggest.NewProvider("")
	} else if providerType != "" {
		log.Printf("Using autosuggest provider: %s", providerType)
	}

	dataSource := os.Getenv("AUTOSUGGEST_DATA_SOURCE")
	if dataSource == "" {
		dataSource = autosuggest.GetDefaultWordsPath()
	}

	log.Printf("Loading words from source: %s", dataSource)
	if err := autosuggestProvider.LoadData(dataSource); err != nil {
		log.Printf("Failed to load words from source: %v", err)
	}
}

func setupExplanationRoutes(api *gin.RouterGroup) {
	explainGroup := api.Group("/explain")

	explainGroup.GET("/search", search)

	explainGroup.GET("/autosuggest", autosuggestHandler)
}

func search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(400, gin.H{"error": "No search query provided"})
		return
	}

	modelID := c.Query("modelId")
	if modelID == "" {
		c.JSON(400, gin.H{"error": "LLM model ID is required"})
		return
	}

	promptType := c.Query("promptType")
	if promptType == "" {
		promptType = "general"
	}

	explanation, err := llm.GenerateExplanation(
		query,
		modelID,
		db.GetLLMModelByID,
		func(pType string) (string, error) { return db.GetPromptTemplate(pType) },
		promptType,
	)
	if err != nil {
		log.Printf("Error generating explanation: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"entry": *explanation})
}

func autosuggestHandler(c *gin.Context) {
	query := c.Query("q")
	limit := 10

	response := autosuggest.HandleRequest(autosuggestProvider, query, limit)

	c.JSON(200, response.Suggestions)
}
