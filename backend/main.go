package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/routes"
)

func main() {
	r := gin.Default()
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": 200,"message": "healthy", })
	})

	routes.RegisterAnalyzeRoutes(r)
	


	r.Run() 
}
