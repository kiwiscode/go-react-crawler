package routes

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/db"
	auth "github.com/kiwiscode/sykell-tech-challenge/middleware"
	"github.com/kiwiscode/sykell-tech-challenge/models"
	"github.com/kiwiscode/sykell-tech-challenge/utils"
)

// Request structures
type UrlReq struct {
	URL string `json:"url"`
}

type Urls struct {
	URLs []string `json:"urls"`
}

type BulkUrlReq struct {
	IDs []int `json:"ids"`
}

func AnalyzeRoutes(r *gin.Engine) {
	// Route declarations
	r.POST("/analyses/create", auth.JWTAuthMiddleware(), createAnalyses)
	r.GET("/analyses/:id", auth.JWTAuthMiddleware(), getAnalysisDetailHandler)
	r.DELETE("/analyses/:id", auth.JWTAuthMiddleware(), deleteAnalysisByIDHandler)
	r.POST("/analyses/queued", auth.JWTAuthMiddleware(), setAnalysisQueuedHandler)
	r.POST("/analyses/running", auth.JWTAuthMiddleware(), runningAnalysisHandler)
	r.POST("/analyses/result", auth.JWTAuthMiddleware(), saveAnalysisResultHandler)
	r.POST("/analyses/:id/toggle_should_pause", auth.JWTAuthMiddleware(), togglePauseAnalysisHandler)
}

// Colly rejects some URLs; I wrote this helper function because it helped understand the error better
func extractURLFromError(err error) string {
	re := regexp.MustCompile(`Get\s+"(.*?)"`)
	matches := re.FindStringSubmatch(err.Error())
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// Another helper function that checks within a loop whether the active URL is in the failedURLs list
func urlInFailedURLs(failedURLs []gin.H, url string) bool {
	for _, f := range failedURLs {
		if f["url"] == url {
			return true
		}
	}
	return false
}

// A route for creating one or multiple analyses /analyses/create
func createAnalyses(c *gin.Context) {
	// Set the req variable as type Urls
	var req Urls

	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// If there is no id at all, send an error
	if len(req.URLs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}

	// Float64 → int
	userID := int(userIDFloat)

	// The created URLs will be stored in a createdURLs variable, so a variable was created for this purpose
	var createdURLs []gin.H
	// The URLs transitioning from queued → running → done/error sometimes cause this route to restart, and since URLs already saved in the database don’t need to be created again, they should be tracked inside failed URLs
	var failedURLs []gin.H

	// A loop is created over the id array received from the request body
	for _, url := range req.URLs {

		// We will store whether the active URL in the loop exists in the database in the variable existingID
		var existingID int
		// Check if the URL already exists for the user in the database
		err := db.DB.QueryRow("SELECT id FROM urls WHERE user_id = ? AND url = ?", userID, url).Scan(&existingID)
		if err != nil {
			if err == sql.ErrNoRows {
				// No existing URL found, so it's safe to proceed with adding it
			} else {
				// Unexpected database error occurred
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
				return
			}
		} else {
			// URL already exists for this user, add it to failedURLs list to avoid duplicate processing
			failedURLs = append(failedURLs, gin.H{
				"id":           existingID,
				"url":          url,
				"status":       "queued",
				"should_pause": false,
			})
			// Skip to the next URL in the loop
			continue
		}

		// Pass the active URL to the analyzeURL function from utils and perform HTML analysis.
		result, err := utils.AnalyzeURL(url)
		if err != nil {
			// If there is a problem with the URL, use the utils function created on line 45. This function helps to better understand the error
			problematicURL := extractURLFromError(err)
			if problematicURL == "" {
				problematicURL = "unknown"
			}

			// Send the problem to the user
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Could not process URL: %s", problematicURL),
			})
			// and stop the loop here
			return
		}

		// Proceed only if the URL is not in the failed URLs list
		if !urlInFailedURLs(failedURLs, url) {

			// Create a new URL record
			newURL := models.URL{
				UserID:                 userID,
				URL:                    url,
				Status:                 "queued",
				ShouldPause:            false,
				Title:                  result.Title,
				HTMLVersion:            result.HTMLVersion,
				HeadingCounts:          result.HeadingCounts,
				InternalLinks:          []models.LinkDetail{},
				ExternalLinks:          []models.LinkDetail{},
				InaccessibleLinks:      []models.LinkDetail{},
				HasLoginForm:           result.HasLoginForm,
				InternalLinksCount:     result.InternalLinksCount,
				ExternalLinksCount:     result.ExternalLinksCount,
				InaccessibleLinksCount: result.InaccessibleLinksCount,
				CreatedAt:              time.Now(),
			}

			// Prepare SQL insert statement for the URLs table
			query := `
        INSERT INTO urls (
            user_id, url, status, should_pause, title, html_version, heading_counts, internal_links_count,
            external_links_count, has_login_form, inaccessible_links_count, inaccessible_links,
            internal_links, external_links, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

			// Convert complex fields to JSON strings for storage in JSON columns
			headingCountsJSON, _ := json.Marshal(newURL.HeadingCounts)
			inaccessibleLinksJSON, _ := json.Marshal(newURL.InaccessibleLinks)
			internalLinksJSON, _ := json.Marshal(newURL.InternalLinks)
			externalLinksJSON, _ := json.Marshal(newURL.ExternalLinks)

			// Execute the insert query with URL data, including JSON fields
			res, err := db.DB.Exec(query,
				newURL.UserID,
				newURL.URL,
				newURL.Status,
				newURL.ShouldPause,
				newURL.Title,
				newURL.HTMLVersion,
				headingCountsJSON,
				newURL.InternalLinksCount,
				newURL.ExternalLinksCount,
				newURL.HasLoginForm,
				newURL.InaccessibleLinksCount,
				inaccessibleLinksJSON,
				internalLinksJSON,
				externalLinksJSON,
				newURL.CreatedAt,
			)

			// If insertion fails, respond with a 500 error and message
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save URL data"})
				return
			}

			// Get the ID of the newly inserted URL and add it to the response list. This will be needed on the frontend to properly update the UI with new URLs
			insertedID, _ := res.LastInsertId()

			// Add the new URL info to the createdURLs slice for frontend use
			createdURLs = append(createdURLs, gin.H{
				"id":           insertedID,
				"url":          newURL.URL,
				"status":       newURL.Status,
				"should_pause": false,
			})
		}

	}

	// Respond with success, sending created and failed URLs to the client
	c.JSON(http.StatusOK, gin.H{
		"message":    "Created URLs ",
		"data":       createdURLs,
		"failedURLs": failedURLs,
	})

}

// A route to get details of a specific analysis by ID  /analyses/:id
func getAnalysisDetailHandler(c *gin.Context) {
	// Get the "id" parameter from the URL
	idParam := c.Param("id")
	if idParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
		return
	}

	// Convert idParam from string to integer
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)

	// Query to get the URL details by ID and userID
	query := `
        SELECT 
            id, user_id, url, status, should_pause, title, html_version, heading_counts, 
            internal_links_count, external_links_count, has_login_form, inaccessible_links_count, 
            inaccessible_links, internal_links, external_links, created_at, updated_at
        FROM urls 
        WHERE id = ? AND user_id = ?
    `

	var url models.URL

	row := db.DB.QueryRow(query, id, userID)
	var headingCountsJSON, inaccessibleLinksJSON, internalLinksJSON, externalLinksJSON []byte

	err = row.Scan(
		&url.ID,
		&url.UserID,
		&url.URL,
		&url.Status,
		&url.ShouldPause,
		&url.Title,
		&url.HTMLVersion,
		&headingCountsJSON,
		&url.InternalLinksCount,
		&url.ExternalLinksCount,
		&url.HasLoginForm,
		&url.InaccessibleLinksCount,
		&inaccessibleLinksJSON,
		&internalLinksJSON,
		&externalLinksJSON,
		&url.CreatedAt,
		&url.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Analysis not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	// Unmarshal JSON fields into Go structs
	if err := json.Unmarshal(headingCountsJSON, &url.HeadingCounts); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse heading counts"})
		return
	}
	if err := json.Unmarshal(inaccessibleLinksJSON, &url.InaccessibleLinks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse inaccessible links"})
		return
	}
	if err := json.Unmarshal(internalLinksJSON, &url.InternalLinks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse internal links"})
		return
	}
	if err := json.Unmarshal(externalLinksJSON, &url.ExternalLinks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse external links"})
		return
	}

	// Return the URL analysis details as JSON
	c.JSON(http.StatusOK, gin.H{
		"data": url,
	})
}

// The route required to delete a specific analysis /analyses/:id
func deleteAnalysisByIDHandler(c *gin.Context) {
	// Get the "id" parameter from the URL
	idParam := c.Param("id")
	if idParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
		return
	}

	// Convert idParam from string to integer
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)

	// Check if URL with given id exists and get its owner user_id
	var ownerID int
	row := db.DB.QueryRow("SELECT user_id FROM urls WHERE id = ?", id)
	if err := row.Scan(&ownerID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}

	// Verify that the logged-in user owns this URL
	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this URL"})
		return
	}

	// Delete the URL from the database
	_, err = db.DB.Exec("DELETE FROM urls WHERE id = ?", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete URL"})
		return
	}

	// Send success response
	c.JSON(http.StatusOK, gin.H{"message": "URL deleted successfully"})
}

// The next step after creating an analysis or analyses /analyses/queued
func setAnalysisQueuedHandler(c *gin.Context) {
	// Set the req variable as type BulkUrlReq
	var req BulkUrlReq
	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// If there is no id at all, send an error
	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	// Float64 → int
	userID := int(userIDFloat)

	// The updated URLs will be stored in a updatedURLs variable, so a variable was created for this purpose
	var updatedURLs []gin.H

	// A loop is created over the req array received from the request body
	for _, id := range req.IDs {

		// A variable was created to receive and assign the ownerID
		var ownerID int
		// Add the active URL here
		var url string
		// Query the database for user_id and url where id matches
		row := db.DB.QueryRow("SELECT user_id, url FROM urls WHERE id = ?", id)
		// Scan the result into ownerID and url variables
		// If there's an error, skip to next iteration
		if err := row.Scan(&ownerID, &url); err != nil {
			continue
		}

		// Check if URL with given id exists and get its owner user_id
		if ownerID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this URL"})
			return
		}

		// Pass the active URL to the analyzeURL function from utils and perform HTML analysis.
		result, err := utils.AnalyzeURL(url)
		if err != nil {
			// If analysis fails, update the URL status to "error" in the database and stop the process
			_, _ = db.DB.Exec("UPDATE urls SET status = ? WHERE id = ?", "error", id)
			return
		}

		// Convert complex fields to JSON strings for storage in JSON columns
		headingCountsJSON, _ := json.Marshal(result.HeadingCounts)
		inaccessibleLinksJSON, _ := json.Marshal(result.InaccessibleLinks)
		internalLinksJSON, _ := json.Marshal(result.InternalLinks)
		externalLinksJSON, _ := json.Marshal(result.ExternalLinks)

		// Execute the update query, including JSON fields
		_, err = db.DB.Exec(`
            UPDATE urls
            SET 
                status = ?, 
                should_pause = ?,
                title = ?, 
                html_version = ?, 
                heading_counts = ?, 
                internal_links_count = ?, 
                external_links_count = ?, 
                has_login_form = ?, 
                inaccessible_links_count = ?, 
                inaccessible_links = ?, 
                internal_links = ?, 
                external_links = ?,
                updated_at = ?
            WHERE id = ?`,
			"queued",
			false,
			result.Title,
			result.HTMLVersion,
			headingCountsJSON,
			result.InternalLinksCount,
			result.ExternalLinksCount,
			result.HasLoginForm,
			result.InaccessibleLinksCount,
			inaccessibleLinksJSON,
			internalLinksJSON,
			externalLinksJSON,
			time.Now(),
			id,
		)

		// If there is an error, skip this iteration and continue with the next
		if err != nil {
			continue
		}

		// Add the id and current URL as 'url' to updatedURLs with status 'queued' and should_pause set to false
		updatedURLs = append(updatedURLs, gin.H{
			"id":           id,
			"url":          url,
			"status":       "queued",
			"should_pause": false,
		})

	}

	// then send this array to the user at the end
	c.JSON(http.StatusOK, gin.H{
		"message": "Updated URLs",
		"data":    updatedURLs,
	})

}

// The route for changing the status of analysis or analyses from queued to running after being queued
func runningAnalysisHandler(c *gin.Context) {
	// Set the req variable as type BulkUrlReq
	var req BulkUrlReq
	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// If there is no id at all, send an error
	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	// Float64 → int
	userID := int(userIDFloat)

	// The updated URLs will be stored in a updatedURLs variable, so a variable was created for this purpose
	var updatedURLs []gin.H

	// A loop is created over the req array received from the request body
	for _, id := range req.IDs {

		// A variable was created to receive and assign the ownerID
		var ownerID int
		// Add the active URL here
		var url string
		// Query the database for user_id and url where id matches
		row := db.DB.QueryRow("SELECT user_id, url FROM urls WHERE id = ?", id)
		// Scan the result into ownerID and url variables
		// If there's an error, skip to next iteration
		if err := row.Scan(&ownerID, &url); err != nil {
			continue
		}

		// Check if URL with given id exists and get its owner user_id
		if ownerID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this URL"})
			return
		}

		// Pass the active URL to the analyzeURL function from utils and perform HTML analysis
		result, err := utils.AnalyzeURL(url)
		if err != nil {
			// If analysis fails, update the URL status to "error" in the database and stop the process
			_, _ = db.DB.Exec("UPDATE urls SET status = ? WHERE id = ?", "error", id)
			return
		}

		// Convert complex fields to JSON strings for storage in JSON columns
		headingCountsJSON, _ := json.Marshal(result.HeadingCounts)
		inaccessibleLinksJSON, _ := json.Marshal(result.InaccessibleLinks)
		internalLinksJSON, _ := json.Marshal(result.InternalLinks)
		externalLinksJSON, _ := json.Marshal(result.ExternalLinks)

		// Execute the update query, including JSON fields
		_, err = db.DB.Exec(`
            UPDATE urls
            SET 
                status = ?, 
                should_pause = ?,
                title = ?, 
                html_version = ?, 
                heading_counts = ?, 
                internal_links_count = ?, 
                external_links_count = ?, 
                has_login_form = ?, 
                inaccessible_links_count = ?, 
                inaccessible_links = ?, 
                internal_links = ?, 
                external_links = ?,
                updated_at = ?
            WHERE id = ?`,
			"running",
			false,
			result.Title,
			result.HTMLVersion,
			headingCountsJSON,
			result.InternalLinksCount,
			result.ExternalLinksCount,
			result.HasLoginForm,
			result.InaccessibleLinksCount,
			inaccessibleLinksJSON,
			internalLinksJSON,
			externalLinksJSON,
			time.Now(),
			id,
		)

		// If there is an error, skip this iteration and continue with the next
		if err != nil {
			continue
		}

		// Add the id and current URL as 'url' to updatedURLs with status 'running' and should_pause set to false
		updatedURLs = append(updatedURLs, gin.H{
			"id":           id,
			"url":          url,
			"status":       "running",
			"should_pause": false,
		})

	}

	// then send this array to the user at the end
	c.JSON(http.StatusOK, gin.H{
		"message": "Updated URLs",
		"data":    updatedURLs,
	})

}

// This route is set up as the final step in the queued → running → done/error chain, used to return 'done' or 'error' after the URL analysis /analyses/running
func saveAnalysisResultHandler(c *gin.Context) {
	// Set the req variable as type BulkUrlReq
	var req BulkUrlReq
	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// If there is no id at all, send an error
	if len(req.IDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	// Interface{} → float64
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	// Float64 → int
	userID := int(userIDFloat)

	// The updated URLs will be stored in a updatedURLs variable, so a variable was created for this purpose
	var updatedURLs []gin.H

	// A loop is created over the req array received from the request body
	for _, id := range req.IDs {

		// A variable was created to receive and assign the ownerID
		var ownerID int
		// Add the active URL here
		var url string
		// During the queued → running stage, check if the user toggled the should_pause flag to 0 or 1 and assign it to the variable
		var shouldPause bool
		// Retrieves the user_id (owner), URL, and should_pause value for the given ID from the database
		row := db.DB.QueryRow("SELECT user_id, url, should_pause FROM urls WHERE id = ?", id)
		if err := row.Scan(&ownerID, &url, &shouldPause); err != nil {
			//  If the record is not found or a query error occurs, skip processing this ID and continue with the next
			continue
		}

		// Check if URL with given id exists and get its owner user_id
		if ownerID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this URL"})
			return
		}

		// Pass the active URL to the analyzeURL function from utils and perform HTML analysis
		result, err := utils.AnalyzeURL(url)
		if err != nil {
			// If analysis fails, update the URL status to "error" in the database and stop the process
			_, _ = db.DB.Exec("UPDATE urls SET status = ? WHERE id = ?", "error", id)
			return
		}

		// Convert complex fields to JSON strings for storage in JSON columns
		headingCountsJSON, _ := json.Marshal(result.HeadingCounts)
		inaccessibleLinksJSON, _ := json.Marshal(result.InaccessibleLinks)
		internalLinksJSON, _ := json.Marshal(result.InternalLinks)
		externalLinksJSON, _ := json.Marshal(result.ExternalLinks)

		// Since this is the final step, the analysis for this specific URL is normally considered complete. However, if the user triggered a pause before the API call reached this point, we need to check and retain that state
		// If the shouldPause field is true (1), then set the status to queued
		status := "done"
		if shouldPause {
			status = "queued"
		}

		// Execute the update query, including JSON fields
		_, err = db.DB.Exec(`
            UPDATE urls
            SET 
                status = ?, 
                should_pause = ?,
                title = ?, 
                html_version = ?, 
                heading_counts = ?, 
                internal_links_count = ?, 
                external_links_count = ?, 
                has_login_form = ?, 
                inaccessible_links_count = ?, 
                inaccessible_links = ?, 
                internal_links = ?, 
                external_links = ?,
                updated_at = ?
            WHERE id = ?`,
			status,
			shouldPause,
			result.Title,
			result.HTMLVersion,
			headingCountsJSON,
			result.InternalLinksCount,
			result.ExternalLinksCount,
			result.HasLoginForm,
			result.InaccessibleLinksCount,
			inaccessibleLinksJSON,
			internalLinksJSON,
			externalLinksJSON,
			time.Now(),
			id,
		)

		// If there is an error, skip this iteration and continue with the next
		if err != nil {
			continue
		}

		// Add the id and current URL as 'url' to updatedURLs with status 'queued' and should_pause set to false.
		// Also, store it in the result variable which will be used on the frontend for UI updates.
		updatedURLs = append(updatedURLs, gin.H{
			"id":           id,
			"url":          url,
			"status":       status,
			"should_pause": shouldPause,
			"result":       result,
		})

	}

	// then send this array to the user at the end
	c.JSON(http.StatusOK, gin.H{
		"message": "Updated URLs",
		"data":    updatedURLs,
	})

}

// During the queued → running → done/error process, especially in the running phase, I handle toggle actions like start/stop in this route
func togglePauseAnalysisHandler(c *gin.Context) {
	// Get the "id" parameter from the URL
	idParam := c.Param("id")
	if idParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
		return
	}

	// Convert idParam from string to integer
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
		return
	}

	// Get the userID from the Gin context
	userIDVal, _ := c.Get("userID")
	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)

	var url string
	var ownerID int
	var shouldPause bool
	var status string
	// Retrieve url record details (user_id, url, status, should_pause) by id from the database
	row := db.DB.QueryRow("SELECT user_id, url,status, should_pause FROM urls WHERE id = ?", id)
	// Scan query results into variables; if not found, return 404
	if err := row.Scan(&ownerID, &url, &status, &shouldPause); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}

	// Check if the current user is the owner of the URL; if not, return 403 forbidden
	if ownerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this URL"})
		return
	}

	// Toggle the should_pause boolean value
	newPauseValue := !shouldPause
	// Update the database record with the new should_pause value
	_, err = db.DB.Exec("UPDATE urls SET should_pause = ? WHERE id = ?", newPauseValue, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle pause state"})
		return
	}

	// Return success message along with updated pause state and related info
	c.JSON(http.StatusOK, gin.H{
		"message":      "Pause state toggled successfully",
		"id":           id,
		"should_pause": newPauseValue,
		"status":       status,
		"url":          url,
	})
}
