package routes

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
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

// DefaultPromptTemplatePaths returns the paths to default prompt templates by type
func DefaultPromptTemplatePaths() map[string]string {
	return map[string]string{
		"general": "./prompts/default_explanation.yaml",
		"anki":    "./prompts/default_anki.yaml",
	}
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
func LoadPromptTemplateFromFile(promptType string) (string, error) {
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	paths := DefaultPromptTemplatePaths()
	path, exists := paths[promptType]
	if !exists {
		path = paths["general"] // Fallback to general template
	}

	templateFile := filepath.Join(rootDir, path)

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
	// Get the prompt type from query parameters, default to "general"
	promptType := c.Query("type")
	if promptType == "" {
		promptType = "general"
	}

	// Check if we should return the default template
	useDefault, _ := strconv.ParseBool(c.Query("default"))

	var template string
	var err error

	if useDefault {
		// Load default template for the specified type
		template, err = LoadPromptTemplateFromFile(promptType)
	} else {
		// Get template from database
		template, err = db.GetPromptTemplate(promptType)
		if err == nil && template == "" {
			// If no template in database, load default and save it
			template, err = LoadPromptTemplateFromFile(promptType)
			if err == nil {
				// Try to save default template to database, but continue even if it fails
				if dbErr := db.SavePromptTemplate(template, promptType); dbErr != nil {
					log.Printf("Error saving default %s prompt template: %v", promptType, dbErr)
				}
			}
		}
	}

	if err != nil {
		log.Printf("Error retrieving %s prompt template: %v", promptType, err)
		c.JSON(500, types.ErrorResponse{Error: fmt.Sprintf("Failed to retrieve %s prompt template", promptType)})
		return
	}

	c.JSON(200, types.PromptTemplate{Template: template, Type: promptType})
}

// savePromptTemplate handles the POST request to save a prompt template
func savePromptTemplate(c *gin.Context) {
	var request types.PromptTemplate

	if err := c.ShouldBindJSON(&request); err != nil || request.Template == "" {
		c.JSON(400, types.ErrorResponse{Error: "Invalid or empty template"})
		return
	}

	// Default to general if no type specified
	if request.Type == "" {
		request.Type = "general"
	}

	// Save to database
	if err := db.SavePromptTemplate(request.Template, request.Type); err != nil {
		log.Printf("Error saving %s prompt template: %v", request.Type, err)
		c.JSON(500, types.ErrorResponse{Error: fmt.Sprintf("Failed to save %s prompt template", request.Type)})
		return
	}

	c.JSON(200, gin.H{"message": fmt.Sprintf("%s prompt template saved successfully", request.Type)})
}
