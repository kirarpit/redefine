package routes

import (
	"log"
	"redefine/server/db"
	"redefine/server/models"
	"redefine/server/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// setupSettingsRoutes sets up routes for application settings
func setupSettingsRoutes(api *gin.RouterGroup) {
	settingsGroup := api.Group("/settings")
	
	// Get prompt template
	settingsGroup.GET("/prompt-template", getPromptTemplate)
	
	// Save prompt template
	settingsGroup.POST("/prompt-template", savePromptTemplate)
}

// getPromptTemplate handles the GET request to retrieve the prompt template
func getPromptTemplate(c *gin.Context) {
	// Check if we should return the default template
	useDefault, _ := strconv.ParseBool(c.Query("default"))
	
	var template string
	var err error
	
	if useDefault {
		// Load default template
		template, err = utils.LoadPromptTemplate()
		if err != nil {
			log.Printf("Error loading default prompt template: %v", err)
			c.JSON(500, models.ErrorResponse{Error: "Failed to load default prompt template"})
			return
		}
	} else {
		// Get template from database
		template, err = db.GetPromptTemplate()
		if err != nil {
			log.Printf("Error getting prompt template: %v", err)
			c.JSON(500, models.ErrorResponse{Error: "Failed to retrieve prompt template"})
			return
		}
		
		// If no template in database, load default
		if template == "" {
			template, err = utils.LoadPromptTemplate()
			if err != nil {
				log.Printf("Error loading default prompt template: %v", err)
				c.JSON(500, models.ErrorResponse{Error: "Failed to load default prompt template"})
				return
			}
			
			// Save default template to database
			if err := db.SavePromptTemplate(template); err != nil {
				log.Printf("Error saving default prompt template: %v", err)
				// Continue anyway since we have the template
			}
		}
	}
	
	c.JSON(200, models.PromptTemplate{Template: template})
}

// savePromptTemplate handles the POST request to save a prompt template
func savePromptTemplate(c *gin.Context) {
	var request models.PromptTemplate
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid request data"})
		return
	}
	
	// Validate template
	if request.Template == "" {
		c.JSON(400, models.ErrorResponse{Error: "Template cannot be empty"})
		return
	}
	
	// Save to database
	if err := db.SavePromptTemplate(request.Template); err != nil {
		log.Printf("Error saving prompt template: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to save prompt template"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Prompt template saved successfully"})
} 