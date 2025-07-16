package main

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors" // CORS middleware
	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/go-react-crawler/db"
	auth "github.com/kiwiscode/go-react-crawler/middleware"
	"github.com/kiwiscode/go-react-crawler/routes"
)

func main() {

	// Initialize the database connection and ensure tables(users, urls) exist
	db.Init()

	// Create a Gin router with default middleware (logger and recovery)
	r := gin.Default()

	// Setup CORS middleware with configuration allowing requests from frontend origin
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{os.Getenv("FRONTEND_ORIGIN")},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Simple health check endpoint for development
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": 200, "message": "healthy"})
	})

	// Protected route example with JWT authentication middleware
	r.GET("/protected", auth.JWTAuthMiddleware(), func(c *gin.Context) {
		// Retrieve userID from context, set by JWT middleware
		userID, _ := c.Get("userID")
		c.JSON(http.StatusOK, gin.H{
			"status":  200,
			"message": "active",
			"userID":  userID,
		})
	})

	// Register routes for auth, profile and analyze features
	routes.AuthRoutes(r)
	routes.ProfileRoutes(r)
	routes.AnalyzeRoutes(r)

	// Start the HTTP server on default port 8080
	r.Run(":8080")
}
