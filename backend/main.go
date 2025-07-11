package main

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/db"
	auth "github.com/kiwiscode/sykell-tech-challenge/middleware"
	"github.com/kiwiscode/sykell-tech-challenge/routes"
)

func main() {

	db.Init()
	

	r := gin.Default()

	r.Use(cors.New(cors.Config{
	AllowOrigins:     []string{os.Getenv("FRONTEND_ORIGIN"),}, 
	AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
	AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
	ExposeHeaders:    []string{"Content-Length"},
	AllowCredentials: true,
	MaxAge:           12 * time.Hour,
	}))




	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": 200,"message": "healthy", })
	})

	r.GET("/protected", auth.JWTAuthMiddleware(), func(c *gin.Context) {
        userID, _ := c.Get("userID") // retrieving userID set in the context by the middleware
        c.JSON(http.StatusOK, gin.H{
            "status":  200,
            "message": "active",
            "userID":  userID,
            
        })
    })

	routes.AuthRoutes(r)
	routes.ProfileRoutes(r)
	routes.AnalyzeRoutes(r)
	
	r.Run() 
}
