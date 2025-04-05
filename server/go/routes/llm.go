package routes

import (
	"log"
	"net/url"
	"redefine/server/db"
	"redefine/server/models"
	"redefine/server/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

// setupLLMRoutes sets up routes for LLM model APIs
func setupLLMRoutes(api *gin.RouterGroup) {
	llmGroup := api.Group("/llm")
	
	// Get all models
	llmGroup.GET("/models", getModels)
	
	// Create a new model
	llmGroup.POST("/models", createModel)
	
	// Delete a model
	llmGroup.DELETE("/models/*model_id", removeModel)
	
	// Test a model with a prompt
	llmGroup.POST("/test", testModel)
}

// getModels handles the GET request to retrieve all LLM models
func getModels(c *gin.Context) {
	models, err := db.GetLLMModels()
	if err != nil {
		log.Printf("Error getting LLM models: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to retrieve LLM models"})
		return
	}
	
	c.JSON(200, gin.H{"models": models})
}

// createModel handles the POST request to create a new LLM model
func createModel(c *gin.Context) {
	var request struct {
		Name        string `json:"name"`
		ModelId     string `json:"modelId"`
		ApiKey      string `json:"apiKey"`
		ApiEndpoint string `json:"apiEndpoint"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid request data"})
		return
	}
	
	// Validate required fields
	if request.ModelId == "" || request.Name == "" || request.ApiKey == "" {
		c.JSON(400, models.ErrorResponse{Error: "Missing required fields"})
		return
	}
	
	// Create model
	model := models.LLMModel{
		ID:          request.ModelId,
		Name:        request.Name,
		APIKey:      request.ApiKey,
		APIEndpoint: request.ApiEndpoint,
	}
	
	// Add to database
	_, err := db.AddLLMModel(model)
	if err != nil {
		log.Printf("Error adding LLM model: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to create LLM model"})
		return
	}
	
	c.JSON(201, gin.H{"message": "Model added successfully"})
}

// removeModel handles the DELETE request to remove an LLM model
func removeModel(c *gin.Context) {
	// Get model ID from URL parameter
	modelID := c.Param("model_id")
	if modelID == "" {
		c.JSON(400, models.ErrorResponse{Error: "Model ID is required"})
		return
	}
	
	// The model_id param includes the leading slash, so remove it
	if len(modelID) > 0 && modelID[0] == '/' {
		modelID = modelID[1:]
	}
	
	// URL decode the model ID
	decodedModelID, err := url.QueryUnescape(modelID)
	if err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid model ID"})
		return
	}
	
	// Delete from database
	success, err := db.DeleteLLMModel(decodedModelID)
	if err != nil {
		log.Printf("Error deleting LLM model: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to delete LLM model"})
		return
	}
	
	if !success {
		c.JSON(404, models.ErrorResponse{Error: "Model not found"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Model deleted successfully"})
}

// testModel handles the POST request to test an LLM model with a prompt
func testModel(c *gin.Context) {
	var request struct {
		ModelId     string `json:"modelId"`
		Prompt      string `json:"prompt"`
		ApiKey      string `json:"apiKey"`
		ApiEndpoint string `json:"apiEndpoint"`
		Name        string `json:"name"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid request data"})
		return
	}
	
	// Validate required fields
	if request.ModelId == "" || request.Prompt == "" {
		c.JSON(400, models.ErrorResponse{Error: "Missing required fields"})
		return
	}
	
	// Check if we should skip looking up the model in the database
	skipLookup, _ := strconv.ParseBool(c.Query("skipLookup"))
	
	var model *models.LLMModel
	var err error
	
	if skipLookup {
		// Use provided model details
		model = &models.LLMModel{
			ID:          request.ModelId,
			Name:        request.Name,
			APIKey:      request.ApiKey,
			APIEndpoint: request.ApiEndpoint,
		}
		
		// If name is not provided, use model ID
		if model.Name == "" {
			model.Name = request.ModelId
		}
	} else {
		// Get model from database
		model, err = db.GetLLMModelByID(request.ModelId)
		if err != nil {
			log.Printf("Error getting LLM model: %v", err)
			c.JSON(500, models.ErrorResponse{Error: "Failed to retrieve LLM model"})
			return
		}
		
		if model == nil {
			c.JSON(404, models.ErrorResponse{Error: "Model not found"})
			return
		}
	}
	
	// Test the model
	response, err := utils.TestPrompt(model, request.Prompt)
	if err != nil {
		log.Printf("Error testing LLM model: %v", err)
		c.JSON(500, models.ErrorResponse{Error: err.Error()})
		return
	}
	
	c.JSON(200, gin.H{"response": response})
} 