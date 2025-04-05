package routes

import (
	"log"
	"redefine/server/models"
	"redefine/server/utils"
	"strings"

	"github.com/gin-gonic/gin"
)

// Sample data for autosuggest (in a real app, this would come from a database)
var sampleExplanations = []string{
	"democracy",
	"capitalism",
	"communism",
	"socialism",
	"liberalism",
	"conservatism",
	"authoritarianism",
	"totalitarianism",
	"imperialism",
	"nationalism",
}

// setupExplanationRoutes sets up routes for explanation APIs
func setupExplanationRoutes(api *gin.RouterGroup) {
	explainGroup := api.Group("/explain")
	
	// Search endpoint
	explainGroup.GET("/search", search)
	
	// Autosuggest endpoint
	explainGroup.GET("/autosuggest", autosuggest)
}

// search handles the search API endpoint
func search(c *gin.Context) {
	query := strings.ToLower(c.Query("q"))
	if query == "" {
		c.JSON(400, models.ErrorResponse{Error: "No search query provided"})
		return
	}
	
	modelID := c.Query("modelId")
	if modelID == "" {
		c.JSON(400, models.ErrorResponse{Error: "LLM model ID is required"})
		return
	}
	
	// Generate explanation using LLM
	explanation, err := utils.GenerateExplanation(query, modelID)
	if err != nil {
		log.Printf("Error generating explanation: %v", err)
		c.JSON(500, models.ErrorResponse{Error: err.Error()})
		return
	}
	
	c.JSON(200, models.SearchResponse{Entry: *explanation})
}

// autosuggest handles the autosuggest API endpoint
func autosuggest(c *gin.Context) {
	prefix := strings.ToLower(c.Query("q"))
	if prefix == "" {
		c.JSON(200, []string{})
		return
	}
	
	// Filter sample explanations that start with the prefix
	var suggestions []string
	for _, term := range sampleExplanations {
		if strings.HasPrefix(term, prefix) {
			suggestions = append(suggestions, term)
		}
	}
	
	// Limit to 10 suggestions
	if len(suggestions) > 10 {
		suggestions = suggestions[:10]
	}
	
	c.JSON(200, suggestions)
} 