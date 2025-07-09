package routes

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/db"
	auth "github.com/kiwiscode/sykell-tech-challenge/middleware"
)



func ProfileRoutes(r *gin.Engine) {
	r.GET("/profile", auth.JWTAuthMiddleware(), profileHandler)
}


func profileHandler(c *gin.Context) {
	userIDVal, _ := c.Get("userID")

	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)

	var id int
	var username, email string

	err := db.DB.QueryRow("SELECT id, username, email FROM users WHERE id = ?", userID).
		Scan(&id, &username, &email)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       id,
			"username": username,
			"email":    email,
		},
	})
}
