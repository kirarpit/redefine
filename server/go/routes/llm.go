package routes

import (
	"log"
	"net/url"
	"redefine/server/db"
	"redefine/server/llm"
	_ "redefine/server/llm/providers" // Import for side effects (registering providers)
	"redefine/server/types"
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
	llmModels, err := db.GetLLMModels()
	if err != nil {
		log.Printf("Error getting LLM models: %v", err)
		c.JSON(500, gin.H{"error": "Failed to retrieve LLM models"})
		return
	}

	c.JSON(200, gin.H{"models": llmModels})
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
		c.JSON(400, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate required fields
	if request.ModelId == "" || request.Name == "" || request.ApiKey == "" {
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}

	// Create model
	model := types.LLMModel{
		ID:          request.ModelId,
		Name:        request.Name,
		APIKey:      request.ApiKey,
		APIEndpoint: request.ApiEndpoint,
	}

	// Add to database
	_, err := db.AddLLMModel(model)
	if err != nil {
		log.Printf("Error adding LLM model: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create LLM model"})
		return
	}

	c.JSON(201, gin.H{"message": "Model added successfully"})
}

// removeModel handles the DELETE request to remove an LLM model
func removeModel(c *gin.Context) {
	// Get model ID from URL parameter
	modelID := c.Param("model_id")
	if modelID == "" {
		c.JSON(400, gin.H{"error": "Model ID is required"})
		return
	}

	// URL decode the model ID
	decodedModelID, err := url.QueryUnescape(modelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid model ID"})
		return
	}

	// Remove the leading slash if it exists
	if len(decodedModelID) > 0 && decodedModelID[0] == '/' {
		decodedModelID = decodedModelID[1:]
	}

	log.Printf("Deleting LLM model with ID: %s", decodedModelID)

	// Delete from database
	success, err := db.DeleteLLMModel(decodedModelID)
	if err != nil {
		log.Printf("Error deleting LLM model: %v", err)
		c.JSON(500, gin.H{"error": "Failed to delete LLM model"})
		return
	}

	if !success {
		c.JSON(404, gin.H{"error": "Model not found"})
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
		c.JSON(400, gin.H{"error": "Invalid request data"})
		return
	}

	// Validate required fields
	if request.ModelId == "" || request.Prompt == "" {
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}

	// Check if we should skip looking up the model in the database
	skipLookup, _ := strconv.ParseBool(c.Query("skipLookup"))

	var model *types.LLMModel
	var response string
	var err error
	if skipLookup {
		// Use provided model details
		model = &types.LLMModel{
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
			c.JSON(500, gin.H{"error": "Failed to retrieve LLM model"})
			return
		}

		if model == nil {
			c.JSON(404, gin.H{"error": "Model not found"})
			return
		}
	}

	response, err = llm.TestPrompt(model, request.Prompt, !skipLookup)

	// Test the model
	if err != nil {
		log.Printf("Error testing LLM model: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"response": response})
}
