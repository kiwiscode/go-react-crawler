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
	// Route declarations
	r.GET("/profile", auth.JWTAuthMiddleware(), profileHandler)
	r.DELETE("/profile/urls", auth.JWTAuthMiddleware(),deleteUserURLsHandler )
}



// Get user profile
func profileHandler(c *gin.Context) {
	// Retrieving the user ID stored in the context by middleware
	userIDVal, _ := c.Get("userID")


	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	// Float64 → int
	userID := int(userIDFloat)


	// Variable declarations
	var id int
	var username, email string


	// Get user and set values to the variables
	err := db.DB.QueryRow("SELECT id, username, email FROM users WHERE id = ?", userID).
		Scan(&id, &username, &email)

	if err != nil {
		// Check if user row exist
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			// Stop
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error"})
		return
	}


	// Fetch the URLs related to the user from the URL table
	rows, err := db.DB.Query("SELECT id, user_id, url, status, should_pause, title, html_version, internal_links_count, external_links_count, has_login_form, inaccessible_links_count, created_at, updated_at FROM urls WHERE user_id = ?", userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error on URLs"})
        return
    }
    defer rows.Close()


	// Type declaration for URL in the models/url.go file
	urls := []models.URL{}
	    for rows.Next() {
        var url models.URL
        err := rows.Scan(
            &url.ID,
            &url.UserID,
            &url.URL,
            &url.Status,
			&url.ShouldPause,
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

	// Send the answer to the client in JSON format
	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":       id,
			"username": username,
			"email":    email,
		},
		"urls": urls,
	})
}


// Delete the URLs belonging to the user based on their IDs
func deleteUserURLsHandler(c *gin.Context) {


	// Get the JSON ID array from the body, the array should be filled with integer values
	var req struct {
		IDs []int `json:"ids"`
	}
	
	
	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	

	// Check the length of the ID array, and if it is empty, send an error to the user
	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}



	// Check the context to verify if the ID coming from the middleware exists, and assign the value and error to the variables userIDVal and exists
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	// Float64 → int
	userID := int(userIDFloat)

	placeholders := ""
	args := []interface{}{userID}


	// Add a '?' placeholder for each ID in the req.IDs array coming from the JSON
	for i, id := range req.IDs {
		if i > 0 {
			placeholders += ", "
		}
		placeholders += "?"
		args = append(args, id)
	}

	// Query logic => DELETE FROM urls WHERE user_id = ? AND id IN (?, ?, ?)
	query := fmt.Sprintf("DELETE FROM urls WHERE user_id = ? AND id IN (%s)", placeholders)
	// Execute the query and assign the variables for values and error handling
	result, err := db.DB.Exec(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB error on deleting URLs"})
		return
	}

	// The number of affected (deleted) rows can be checked here from the table
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching rows affected"})
		return
	}

	
	// Send a JSON response with status OK (200) to the client and assign the message along with the number of affected rows to variables
	c.JSON(http.StatusOK, gin.H{
		"message":      "Selected URLs deleted successfully",
		"rows_deleted": rowsAffected,
	})
}
