package routes

import (
	"log"
	"os"
	"redefine/server/autosuggest"
	"redefine/server/db"
	"redefine/server/llm"
	_ "redefine/server/llm/providers" // Import for side effects (registering providers)

	"github.com/gin-gonic/gin"
)

// Global autosuggest provider
var autosuggestProvider autosuggest.Provider

// Initialize the autosuggest provider
func init() {
	// Get provider type from environment variable or use default
	providerType := os.Getenv("AUTOSUGGEST_PROVIDER")

	// Create a new autosuggest provider
	var err error
	autosuggestProvider, err = autosuggest.NewProvider(providerType)
	if err != nil {
		log.Printf("Failed to create autosuggest provider: %v. Using default provider.", err)
		autosuggestProvider, _ = autosuggest.NewProvider("") // Use default
	} else {
		log.Printf("Using autosuggest provider: %s", providerType)
	}

	// Get the data source from environment variable or use default
	dataSource := os.Getenv("AUTOSUGGEST_DATA_SOURCE")
	if dataSource == "" {
		dataSource = "https://raw.githubusercontent.com/dwyl/english-words/master/words.txt"
	}

	// Load words from the data source
	log.Printf("Loading words from source: %s", dataSource)
	if err := autosuggestProvider.LoadData(dataSource); err != nil {
		log.Printf("Failed to load words from source: %v", err)
	}
}

// setupExplanationRoutes sets up routes for explanation APIs
func setupExplanationRoutes(api *gin.RouterGroup) {
	explainGroup := api.Group("/explain")

	// Search endpoint
	explainGroup.GET("/search", search)

	// Autosuggest endpoint
	explainGroup.GET("/autosuggest", autosuggestHandler)
}

// search handles the main search API endpoint
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

	// Get prompt type from query parameters (default to "general")
	promptType := c.Query("promptType")
	if promptType == "" {
		promptType = "general"
	}

	// Generate explanation using LLM
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

// autosuggestHandler handles the autosuggest API endpoint
func autosuggestHandler(c *gin.Context) {
	query := c.Query("q")
	limit := 10 // Default limit

	// Use the handler function from the autosuggest package
	response := autosuggest.HandleRequest(autosuggestProvider, query, limit)

	c.JSON(200, response.Suggestions) // Keep the response format the same for backward compatibility
}
