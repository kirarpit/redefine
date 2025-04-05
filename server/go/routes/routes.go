package routes

import (
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(r *gin.Engine) {
	// API group
	api := r.Group("/api")
	
	// API info endpoint
	api.GET("", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Redefine API server is running",
			"endpoints": []string{
				"/api/explain/search",
				"/api/explain/autosuggest",
				"/api/flashcards",
				"/api/llm/models",
				"/api/settings/prompt-template",
			},
		})
	})
	
	// Register all routes
	setupExplanationRoutes(api)
	setupFlashcardRoutes(api)
	setupLLMRoutes(api)
	setupSettingsRoutes(api)
} 