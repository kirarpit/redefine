package main

import (
	"log"
	"os"
	"path/filepath"
	"redefine/server/db"
	"redefine/server/routes"

	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables from .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found")
	}

	// Initialize database
	if err := db.Initialize(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Set up Gin
	r := gin.Default()

	// Configure CORS
	if os.Getenv("GIN_MODE") != "release" {
		log.Println("CORS enabled for development")
		r.Use(cors.New(cors.Config{
			AllowOrigins:     []string{"http://localhost:3000"},
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type"},
			AllowCredentials: true,
		}))
	}

	// Can't serve /app/static at root because /api will conflict with it.
	r.Use(staticFileMiddleware("/app/static"))

	// Set up API routes
	routes.SetupRoutes(r)

	r.NoRoute(func(c *gin.Context) {
		c.File("/app/static/index.html")
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}
	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func staticFileMiddleware(root string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip /api routes
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.Next()
			return
		}

		// Absolute path to the file
		fullPath := filepath.Join(root, filepath.Clean(c.Request.URL.Path))

		// If it exists and is not a directory, serve it
		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			c.File(fullPath)
			c.Abort()
			return
		}

		// Otherwise, continue to the next handler (NoRoute)
		c.Next()
	}
}
