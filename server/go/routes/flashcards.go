package routes

import (
	"log"
	"redefine/server/db"
	"redefine/server/models"
	"time"

	"github.com/gin-gonic/gin"
)

// setupFlashcardRoutes sets up routes for flashcard APIs
func setupFlashcardRoutes(api *gin.RouterGroup) {
	flashcardGroup := api.Group("/flashcards")
	
	// Get all flashcards
	flashcardGroup.GET("/", getAllFlashcards)
	
	// Create a new flashcard
	flashcardGroup.POST("/", createFlashcard)
	
	// Delete a flashcard
	flashcardGroup.DELETE("/", deleteFlashcard)
	
	// Export flashcards
	flashcardGroup.POST("/export", exportFlashcards)
}

// getAllFlashcards handles the GET request to retrieve all flashcards
func getAllFlashcards(c *gin.Context) {
	flashcards, err := db.GetFlashcards()
	if err != nil {
		log.Printf("Error getting flashcards: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to retrieve flashcards"})
		return
	}
	
	c.JSON(200, flashcards)
}

// createFlashcard handles the POST request to create a new flashcard
func createFlashcard(c *gin.Context) {
	var flashcard models.Flashcard
	if err := c.ShouldBindJSON(&flashcard); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid flashcard data"})
		return
	}
	
	// Validate required fields
	if flashcard.Front == "" || flashcard.Back == "" || flashcard.Query == "" {
		c.JSON(400, models.ErrorResponse{Error: "Missing required fields"})
		return
	}
	
	// Set exported timestamp if not provided
	if flashcard.ExportedAt == "" {
		flashcard.ExportedAt = time.Now().Format(time.RFC3339)
	}
	
	// Add to database
	createdFlashcard, err := db.AddFlashcard(flashcard)
	if err != nil {
		log.Printf("Error adding flashcard: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to create flashcard"})
		return
	}
	
	c.JSON(201, createdFlashcard)
}

// deleteFlashcard handles the DELETE request to remove a flashcard
func deleteFlashcard(c *gin.Context) {
	var request struct {
		Front string `json:"front"`
		Back  string `json:"back"`
		Query string `json:"query"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid request data"})
		return
	}
	
	// Validate required fields
	if request.Front == "" || request.Back == "" || request.Query == "" {
		c.JSON(400, models.ErrorResponse{Error: "Missing required fields"})
		return
	}
	
	// Delete from database
	success, err := db.DeleteFlashcard(request.Query, request.Front, request.Back)
	if err != nil {
		log.Printf("Error deleting flashcard: %v", err)
		c.JSON(500, models.ErrorResponse{Error: "Failed to delete flashcard"})
		return
	}
	
	if !success {
		c.JSON(404, models.ErrorResponse{Error: "Flashcard not found"})
		return
	}
	
	c.JSON(200, gin.H{"message": "Flashcard deleted successfully"})
}

// exportFlashcards handles the POST request to export flashcards
func exportFlashcards(c *gin.Context) {
	var request struct {
		Flashcards []models.Flashcard `json:"flashcards"`
		Format     string             `json:"format"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, models.ErrorResponse{Error: "Invalid request data"})
		return
	}
	
	if len(request.Flashcards) == 0 {
		c.JSON(400, models.ErrorResponse{Error: "No flashcards provided"})
		return
	}
	
	// Set default format if not provided
	if request.Format == "" {
		request.Format = "anki"
	}
	
	// Save flashcards to database
	var savedFlashcards []models.Flashcard
	for _, card := range request.Flashcards {
		// Set exported timestamp if not provided
		if card.ExportedAt == "" {
			card.ExportedAt = time.Now().Format(time.RFC3339)
		}
		
		// Only save flashcards with a query
		if card.Query != "" {
			savedCard, err := db.AddFlashcard(card)
			if err != nil {
				log.Printf("Error saving flashcard: %v", err)
				// Continue with other cards
				continue
			}
			
			if savedCard != nil {
				savedFlashcards = append(savedFlashcards, *savedCard)
			}
		}
	}
	
	// Process based on format
	if request.Format == "anki" {
		// Create Anki-compatible format
		ankiData := gin.H{
			"notes": make([]gin.H, len(request.Flashcards)),
			"saved_flashcards": savedFlashcards,
		}
		
		for i, card := range request.Flashcards {
			ankiData["notes"].([]gin.H)[i] = gin.H{
				"front": card.Front,
				"back":  card.Back,
				"tags":  []string{card.Query},
			}
		}
		
		c.JSON(200, ankiData)
	} else if request.Format == "csv" {
		// Create CSV format (just the data structure, not the actual file)
		csvData := gin.H{
			"headers": []string{"front", "back", "query"},
			"rows":    make([][]string, len(request.Flashcards)),
			"saved_flashcards": savedFlashcards,
		}
		
		for i, card := range request.Flashcards {
			csvData["rows"].([][]string)[i] = []string{card.Front, card.Back, card.Query}
		}
		
		c.JSON(200, csvData)
	} else {
		c.JSON(400, models.ErrorResponse{Error: "Unsupported format: " + request.Format})
	}
} 