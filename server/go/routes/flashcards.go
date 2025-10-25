package routes

import (
	"log"
	"redefine/server/db"
	"redefine/server/types"
	"time"

	"github.com/gin-gonic/gin"
)

func setupFlashcardRoutes(api *gin.RouterGroup) {
	flashcardGroup := api.Group("/flashcards")

	flashcardGroup.GET("/", getAllFlashcards)

	flashcardGroup.POST("/", createFlashcard)

	flashcardGroup.DELETE("/", deleteFlashcard)

	flashcardGroup.POST("/export", exportFlashcards)
}

func getAllFlashcards(c *gin.Context) {
	flashcards, err := db.GetFlashcards()
	if err != nil {
		log.Printf("Error getting flashcards: %v", err)
		c.JSON(500, types.ErrorResponse{Error: "Failed to retrieve flashcards"})
		return
	}

	c.JSON(200, flashcards)
}

func createFlashcard(c *gin.Context) {
	var flashcard types.Flashcard
	if err := c.ShouldBindJSON(&flashcard); err != nil {
		c.JSON(400, types.ErrorResponse{Error: "Invalid flashcard data"})
		return
	}

	if flashcard.Front == "" || flashcard.Query == "" {
		c.JSON(400, types.ErrorResponse{Error: "Missing required fields"})
		return
	}

	if flashcard.ExportedAt == "" {
		flashcard.ExportedAt = time.Now().Format(time.RFC3339)
	}

	createdFlashcard, err := db.AddFlashcard(flashcard)
	if err != nil {
		log.Printf("Error adding flashcard: %v", err)
		c.JSON(500, types.ErrorResponse{Error: "Failed to create flashcard"})
		return
	}

	c.JSON(201, createdFlashcard)
}

func deleteFlashcard(c *gin.Context) {
	var request struct {
		Front string `json:"front"`
		Back  string `json:"back"`
		Query string `json:"query"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, types.ErrorResponse{Error: "Invalid request data"})
		return
	}

	if request.Front == "" || request.Query == "" {
		c.JSON(400, types.ErrorResponse{Error: "Missing required fields"})
		return
	}

	success, err := db.DeleteFlashcard(request.Query, request.Front, request.Back)
	if err != nil {
		log.Printf("Error deleting flashcard: %v", err)
		c.JSON(500, types.ErrorResponse{Error: "Failed to delete flashcard"})
		return
	}

	if !success {
		c.JSON(404, types.ErrorResponse{Error: "Flashcard not found"})
		return
	}

	c.JSON(200, gin.H{"message": "Flashcard deleted successfully"})
}

func exportFlashcards(c *gin.Context) {
	var request struct {
		Flashcards []types.Flashcard `json:"flashcards"`
		Format     string            `json:"format"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		log.Printf("Invalid request data: %v", err)
		c.JSON(400, types.ErrorResponse{Error: "Invalid request data"})
		return
	}

	if len(request.Flashcards) == 0 {
		c.JSON(400, types.ErrorResponse{Error: "No flashcards provided"})
		return
	}

	if request.Format == "" {
		request.Format = "anki"
	}

	log.Printf("Exporting %d flashcards in %s format", len(request.Flashcards), request.Format)

	var savedFlashcards []types.Flashcard
	var skippedCount int
	for _, card := range request.Flashcards {

		if card.Front == "" || card.Query == "" {
			log.Printf("Skipping flashcard with missing required fields: %+v", card)
			continue
		}

		if card.ExportedAt == "" {
			card.ExportedAt = time.Now().Format(time.RFC3339)
		}

		exists, err := db.FlashcardExists(card.Front, card.Back, card.Query)
		if err != nil {
			log.Printf("Error checking if flashcard exists: %v", err)
			continue
		}

		if exists {
			log.Printf("Flashcard already exists, skipping: %s / %s", card.Front, card.Query)
			skippedCount++

			savedFlashcards = append(savedFlashcards, card)
			continue
		}

		savedCard, err := db.AddFlashcard(card)
		if err != nil {
			log.Printf("Error saving flashcard: %v", err)

			continue
		}

		if savedCard != nil {
			log.Printf("Successfully saved flashcard: %s / %s", card.Front, card.Query)
			savedFlashcards = append(savedFlashcards, *savedCard)
		}
	}

	log.Printf("Export summary: %d saved, %d skipped (already existed)",
		len(savedFlashcards)-skippedCount, skippedCount)

	if request.Format == "anki" {

		ankiData := gin.H{
			"notes":            make([]gin.H, len(request.Flashcards)),
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

		csvData := gin.H{
			"headers":          []string{"front", "back", "query"},
			"rows":             make([][]string, len(request.Flashcards)),
			"saved_flashcards": savedFlashcards,
		}

		for i, card := range request.Flashcards {
			csvData["rows"].([][]string)[i] = []string{card.Front, card.Back, card.Query}
		}

		c.JSON(200, csvData)
	} else {
		c.JSON(400, types.ErrorResponse{Error: "Unsupported format: " + request.Format})
	}
}
