package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/utils"
)

type UrlReq struct {
    URL string `json:"url"`
}

func RegisterAnalyzeRoutes(r *gin.Engine) {
    r.GET("/analyze", analyzeHandler)
}

func analyzeHandler(c *gin.Context) {
	var req UrlReq
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	if req.URL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URL parameter is needed"})
		return
	}

	fmt.Printf("req.URL: %s\n", req.URL)

	result, err := utils.AnalyzeURL(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

