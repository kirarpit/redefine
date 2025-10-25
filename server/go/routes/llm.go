package routes

import (
	"log"
	"net/url"
	"redefine/server/db"
	"redefine/server/llm"
	_ "redefine/server/llm/providers"
	"redefine/server/types"
	"strconv"

	"github.com/gin-gonic/gin"
)

func setupLLMRoutes(api *gin.RouterGroup) {
	llmGroup := api.Group("/llm")

	llmGroup.GET("/models", getModels)

	llmGroup.POST("/models", createModel)

	llmGroup.DELETE("/models/*model_id", removeModel)

	llmGroup.POST("/test", testModel)
}

func getModels(c *gin.Context) {
	llmModels, err := db.GetLLMModels()
	if err != nil {
		log.Printf("Error getting LLM models: %v", err)
		c.JSON(500, gin.H{"error": "Failed to retrieve LLM models"})
		return
	}

	sanitized := make([]types.LLMModel, len(llmModels))
	for i, model := range llmModels {
		sanitized[i] = model
		sanitized[i].APIKey = apiKeyPreview(model.APIKey)
	}

	c.JSON(200, gin.H{"models": sanitized})
}

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

	if request.ModelId == "" || request.Name == "" || request.ApiKey == "" {
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}

	model := types.LLMModel{
		ID:          request.ModelId,
		Name:        request.Name,
		APIKey:      request.ApiKey,
		APIEndpoint: request.ApiEndpoint,
	}

	_, err := db.AddLLMModel(model)
	if err != nil {
		log.Printf("Error adding LLM model: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create LLM model"})
		return
	}

	c.JSON(201, gin.H{"message": "Model added successfully"})
}

func removeModel(c *gin.Context) {

	modelID := c.Param("model_id")
	if modelID == "" {
		c.JSON(400, gin.H{"error": "Model ID is required"})
		return
	}

	decodedModelID, err := url.QueryUnescape(modelID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid model ID"})
		return
	}

	if len(decodedModelID) > 0 && decodedModelID[0] == '/' {
		decodedModelID = decodedModelID[1:]
	}

	log.Printf("Deleting LLM model with ID: %s", decodedModelID)

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

	if request.ModelId == "" || request.Prompt == "" {
		c.JSON(400, gin.H{"error": "Missing required fields"})
		return
	}

	skipLookup, _ := strconv.ParseBool(c.Query("skipLookup"))

	var model *types.LLMModel
	var response string
	var err error
	if skipLookup {

		model = &types.LLMModel{
			ID:          request.ModelId,
			Name:        request.Name,
			APIKey:      request.ApiKey,
			APIEndpoint: request.ApiEndpoint,
		}

		if model.Name == "" {
			model.Name = request.ModelId
		}
	} else {

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

	if err != nil {
		log.Printf("Error testing LLM model: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"response": response})
}

func apiKeyPreview(key string) string {
	if key == "" {
		return ""
	}

	runes := []rune(key)
	if len(runes) <= 4 {
		return key
	}

	return string(runes[len(runes)-4:])
}
