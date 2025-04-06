package main

import (
	"log"
	"os"
	"redefine/server/db"
	"redefine/server/routes"

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

	// Set up API routes
	routes.SetupRoutes(r)

	r.Static("/static", "/app/static/static")
	r.StaticFile("/", "/app/static/index.html")
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
