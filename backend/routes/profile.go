package routes

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/db"
	auth "github.com/kiwiscode/sykell-tech-challenge/middleware"
	"github.com/kiwiscode/sykell-tech-challenge/models"
)



func ProfileRoutes(r *gin.Engine) {
	r.GET("/profile", auth.JWTAuthMiddleware(), profileHandler)
	r.DELETE("/profile/urls", auth.JWTAuthMiddleware(),deleteUserURLsHandler )
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


	rows, err := db.DB.Query("SELECT id, user_id, url, status, title, html_version, internal_links_count, external_links_count, has_login_form, inaccessible_links_count, created_at, updated_at FROM urls WHERE user_id = ?", userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error on URLs"})
        return
    }
    defer rows.Close()

	urls := []models.URL{}
	    for rows.Next() {
        var url models.URL
        err := rows.Scan(
            &url.ID,
            &url.UserID,
            &url.URL,
            &url.Status,
            &url.Title,
            &url.HTMLVersion,
            &url.InternalLinksCount,
            &url.ExternalLinksCount,
            &url.HasLoginForm,
            &url.InaccessibleLinksCount,
            &url.CreatedAt,
			&url.UpdatedAt,
        )
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "DB scan error"})
            return
        }
        urls = append(urls, url)
    }

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       id,
			"username": username,
			"email":    email,
		},
		"urls": urls,
	})
}


func deleteUserURLsHandler(c *gin.Context) {
	var req struct {
		IDs []int `json:"ids"`
	}
	
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	fmt.Printf("ids to delete" )

	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}

	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)

	placeholders := ""
	args := []interface{}{userID}

	for i, id := range req.IDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += "?"
		args = append(args, id)
	}

	query := fmt.Sprintf("DELETE FROM urls WHERE user_id = ? AND id IN (%s)", placeholders)
	result, err := db.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error on deleting URLs"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching rows affected"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Selected URLs deleted successfully",
		"rows_deleted": rowsAffected,
	})
}
