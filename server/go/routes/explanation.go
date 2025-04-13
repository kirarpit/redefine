package routes

import (
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"redefine/server/db"
	"redefine/server/llm"
	_ "redefine/server/llm/providers" // Import for side effects (registering providers)

	"github.com/gin-gonic/gin"
)

// Global radix trie for autocomplete
var wordsTrie *RadixTrie

// Initialize the radix trie
func init() {
	wordsTrie = NewRadixTrie()
	wordsFilePath := filepath.Join(os.TempDir(), "english-words.txt")

	// Check if the file exists
	if _, err := os.Stat(wordsFilePath); os.IsNotExist(err) {
		log.Println("Words file not found, downloading...")
		if err := downloadWordsFile(wordsFilePath); err != nil {
			log.Printf("Failed to download words file: %v", err)
			return
		}
	}

	// Load words from the local file
	if err := wordsTrie.LoadFromFile(wordsFilePath); err != nil {
		log.Printf("Failed to load words file: %v", err)
	}
}

// downloadWordsFile downloads the words file from GitHub and saves it locally
func downloadWordsFile(filePath string) error {
	// Create the file
	out, err := os.Create(filePath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Get the data
	resp, err := http.Get("https://raw.githubusercontent.com/dwyl/english-words/master/words.txt")
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Check server response
	if resp.StatusCode != http.StatusOK {
		return err
	}

	// Writer the body to file
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return err
	}

	return nil
}

// setupExplanationRoutes sets up routes for explanation APIs
func setupExplanationRoutes(api *gin.RouterGroup) {
	explainGroup := api.Group("/explain")

	// Search endpoint
	explainGroup.GET("/search", search)

	// Autosuggest endpoint
	explainGroup.GET("/autosuggest", autosuggest)
}

// search handles the main search API endpoint
func search(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(400, gin.H{"error": "No search query provided"})
		return
	}

	modelID := c.Query("modelId")
	if modelID == "" {
		c.JSON(400, gin.H{"error": "LLM model ID is required"})
		return
	}

	// Get prompt type from query parameters (default to "general")
	promptType := c.Query("promptType")
	if promptType == "" {
		promptType = "general"
	}

	// Generate explanation using LLM
	explanation, err := llm.GenerateExplanation(
		query,
		modelID,
		db.GetLLMModelByID,
		func(pType string) (string, error) { return db.GetPromptTemplate(pType) },
		promptType,
	)
	if err != nil {
		log.Printf("Error generating explanation: %v", err)
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, gin.H{"entry": *explanation})
}

// autosuggest handles the autosuggest API endpoint
func autosuggest(c *gin.Context) {
	prefix := c.Query("q")
	if prefix == "" {
		c.JSON(200, []string{})
		return
	}
	suggestions := wordsTrie.FindWords(prefix, 10)
	c.JSON(200, suggestions)
}
