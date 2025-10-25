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

type PromptData struct {
	Prompt struct {
		Template string `yaml:"template"`
	} `yaml:"prompt"`
}

func DefaultPromptTemplatePaths() map[string]string {
	return map[string]string{
		"general": "./prompts/default_explanation.yaml",
		"anki":    "./prompts/default_anki.yaml",
	}
}

func setupSettingsRoutes(api *gin.RouterGroup) {
	settingsGroup := api.Group("/settings")

	settingsGroup.GET("/prompt-template", getPromptTemplate)

	settingsGroup.POST("/prompt-template", savePromptTemplate)
}

func LoadPromptTemplateFromFile(promptType string) (string, error) {
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	paths := DefaultPromptTemplatePaths()
	path, exists := paths[promptType]
	if !exists {
		path = paths["general"]
	}

	templateFile := filepath.Join(rootDir, path)

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

func getPromptTemplate(c *gin.Context) {

	promptType := c.Query("type")
	if promptType == "" {
		promptType = "general"
	}

	useDefault, _ := strconv.ParseBool(c.Query("default"))

	var template string
	var err error

	if useDefault {

		template, err = LoadPromptTemplateFromFile(promptType)
	} else {

		template, err = db.GetPromptTemplate(promptType)
		if err == nil && template == "" {

			template, err = LoadPromptTemplateFromFile(promptType)
			if err == nil {

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

func savePromptTemplate(c *gin.Context) {
	var request types.PromptTemplate

	if err := c.ShouldBindJSON(&request); err != nil || request.Template == "" {
		c.JSON(400, types.ErrorResponse{Error: "Invalid or empty template"})
		return
	}

	if request.Type == "" {
		request.Type = "general"
	}

	if err := db.SavePromptTemplate(request.Template, request.Type); err != nil {
		log.Printf("Error saving %s prompt template: %v", request.Type, err)
		c.JSON(500, types.ErrorResponse{Error: fmt.Sprintf("Failed to save %s prompt template", request.Type)})
		return
	}

	c.JSON(200, gin.H{"message": fmt.Sprintf("%s prompt template saved successfully", request.Type)})
}
