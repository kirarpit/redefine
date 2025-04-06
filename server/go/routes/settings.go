package routes

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"redefine/server/config"
	"redefine/server/db"
	"redefine/server/types"
	"strconv"

	"github.com/gin-gonic/gin"
	"gopkg.in/yaml.v3"
)

// PromptData represents the structure of the prompt template file
type PromptData struct {
	Prompt struct {
		Template string `yaml:"template"`
	} `yaml:"prompt"`
}

// setupSettingsRoutes sets up routes for application settings
func setupSettingsRoutes(api *gin.RouterGroup) {
	settingsGroup := api.Group("/settings")

	// Get prompt template
	settingsGroup.GET("/prompt-template", getPromptTemplate)

	// Save prompt template
	settingsGroup.POST("/prompt-template", savePromptTemplate)
}

// LoadPromptTemplateFromFile loads the default prompt template from the YAML file
func LoadPromptTemplateFromFile() (string, error) {
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	templateFile := filepath.Join(rootDir, config.DefaultPromptTemplatePath())

	// Read and parse the YAML file
	data, err := os.ReadFile(templateFile)
	if err != nil {
		return "", fmt.Errorf("failed to read prompt template file: %w", err)
	}

	var promptData PromptData
	if err := yaml.Unmarshal(data, &promptData); err != nil {
		return "", fmt.Errorf("failed to parse prompt template file: %w", err)
	}

	return promptData.Prompt.Template, nil
}

// getPromptTemplate handles the GET request to retrieve the prompt template
func getPromptTemplate(c *gin.Context) {
	// Check if we should return the default template
	useDefault, _ := strconv.ParseBool(c.Query("default"))

	var template string
	var err error

	if useDefault {
		// Load default template
		template, err = LoadPromptTemplateFromFile()
	} else {
		// Get template from database
		template, err = db.GetPromptTemplate()
		if err == nil && template == "" {
			// If no template in database, load default and save it
			template, err = LoadPromptTemplateFromFile()
			if err == nil {
				// Try to save default template to database, but continue even if it fails
				if dbErr := db.SavePromptTemplate(template); dbErr != nil {
					log.Printf("Error saving default prompt template: %v", dbErr)
				}
			}
		}
	}

	if err != nil {
		log.Printf("Error retrieving prompt template: %v", err)
		c.JSON(500, types.ErrorResponse{Error: "Failed to retrieve prompt template"})
		return
	}

	c.JSON(200, types.PromptTemplate{Template: template})
}

// savePromptTemplate handles the POST request to save a prompt template
func savePromptTemplate(c *gin.Context) {
	var request types.PromptTemplate

	if err := c.ShouldBindJSON(&request); err != nil || request.Template == "" {
		c.JSON(400, types.ErrorResponse{Error: "Invalid or empty template"})
		return
	}

	// Save to database
	if err := db.SavePromptTemplate(request.Template); err != nil {
		log.Printf("Error saving prompt template: %v", err)
		c.JSON(500, types.ErrorResponse{Error: "Failed to save prompt template"})
		return
	}

	c.JSON(200, gin.H{"message": "Prompt template saved successfully"})
}
