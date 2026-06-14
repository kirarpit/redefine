package routes

import (
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {

	api := r.Group("/api")

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

	setupExplanationRoutes(api)
	setupFlashcardRoutes(api)
	setupLLMRoutes(api)
	setupSettingsRoutes(api)
	setupAnkiRoutes(api)
}
