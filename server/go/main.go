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
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: No .env file found")
	}

	if err := db.Initialize(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	r := gin.Default()

	if os.Getenv("GIN_MODE") != "release" {
		log.Println("CORS enabled for development")
		r.Use(cors.New(cors.Config{
			AllowOrigins:     []string{"*"},
			AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Origin", "Content-Type"},
			AllowCredentials: true,
		}))
	}

	r.Use(staticFileMiddleware("/app/static"))

	routes.SetupRoutes(r)

	r.NoRoute(func(c *gin.Context) {
		c.File("/app/static/index.html")
	})

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
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.Next()
			return
		}

		fullPath := filepath.Join(root, filepath.Clean(c.Request.URL.Path))

		if info, err := os.Stat(fullPath); err == nil && !info.IsDir() {
			c.File(fullPath)
			c.Abort()
			return
		}

		c.Next()
	}
}
