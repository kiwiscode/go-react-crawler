package routes

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kiwiscode/sykell-tech-challenge/db"
	auth "github.com/kiwiscode/sykell-tech-challenge/middleware"
	"github.com/kiwiscode/sykell-tech-challenge/models"
	"github.com/kiwiscode/sykell-tech-challenge/utils"
)

type UrlReq struct {
    URL string `json:"url"`
}

type BulkUrlReq struct {
    IDs []int `json:"ids"`
}

func AnalyzeRoutes(r *gin.Engine) {
    r.POST("/analyze",auth.JWTAuthMiddleware(), analyzeHandler)
    r.PUT("/analyses/:id", auth.JWTAuthMiddleware(), updateAnalysisByIDHandler)
    r.DELETE("/analyses/:id", auth.JWTAuthMiddleware(), deleteAnalysisByIDHandler)
    r.POST("/analyses/bulk",auth.JWTAuthMiddleware(), bulkDeleteAnalysesHandler)
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

	userIDVal, _ := c.Get("userID")

	userIDFloat, ok := userIDVal.(float64)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
		return
	}
	userID := int(userIDFloat)
	
    

	result, err := utils.AnalyzeURL(req.URL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	

	newURL := models.URL{
        UserID:               userID,
        URL:                  req.URL,
        Status:               "done",
        HTMLVersion:          result.HTMLVersion,
        Title:                result.Title,
        HeadingCounts:        result.HeadingCounts,
        InternalLinks:        []models.LinkDetail{},
        ExternalLinks:        []models.LinkDetail{}, 
        InaccessibleLinks:    []models.LinkDetail{}, 
        HasLoginForm:     	  result.HasLoginForm,
        InternalLinksCount:   result.InternalLinksCount,
        ExternalLinksCount:   result.ExternalLinksCount,
        InaccessibleLinksCount: result.InaccessibleLinksCount,           
        CreatedAt:            time.Now(),
    }

	query := `
        INSERT INTO urls (
            user_id, url, status, title, html_version, heading_counts, internal_links_count,
            external_links_count, has_login_form, inaccessible_links_count, inaccessible_links,
            internal_links, external_links, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    headingCountsJSON, _ := json.Marshal(newURL.HeadingCounts)
    inaccessibleLinksJSON, _ := json.Marshal(newURL.InaccessibleLinks)
    internalLinksJSON, _ := json.Marshal(newURL.InternalLinks)
    externalLinksJSON, _ := json.Marshal(newURL.ExternalLinks)

    

	createdURL, err := db.DB.Exec(query,
        newURL.UserID,
        newURL.URL,
        newURL.Status,
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
	if err != nil {
    fmt.Printf("error: %s\n",err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save URL data"})
        return
    }

    fmt.Printf("req.URL: %s\n", req.URL)


    lastInsertID, err := createdURL.LastInsertId()
    if err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get last insert ID"})
    return
    }


    var user models.User
    row := db.DB.QueryRow("SELECT id, username, email, created_at FROM users WHERE id = ?", userID)
    err = row.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "User not found"})
        return
    }
    
    newURL.ID = int(lastInsertID)

    user.URLs = append(user.URLs, newURL)

    fmt.Print("user:",user)
    fmt.Println("Created URL ID:", lastInsertID)

	c.JSON(http.StatusOK, result)
}

func updateAnalysisByIDHandler (c *gin.Context) {
    idParam := c.Param("id")
    if idParam == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
        return
    }

    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
        return
    }

    userIDVal, _ := c.Get("userID")
    userIDFloat, ok := userIDVal.(float64)
    if !ok {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
        return
    }
    userID := int(userIDFloat)


    var url string
    var ownerID int
    row := db.DB.QueryRow("SELECT user_id, url FROM urls WHERE id = ?", id)
    if err := row.Scan(&ownerID, &url); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
        return
    }
 
    if ownerID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this URL"})
        return
    } 

    fmt.Printf("req.URL: %s\n", url)

    result, err := utils.AnalyzeURL(url)
    if err != nil {
        _, _ = db.DB.Exec("UPDATE urls SET status = ? WHERE id = ?", "error", id)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to analyze URL"})
        return
    }

    headingCountsJSON, _ := json.Marshal(result.HeadingCounts)
    inaccessibleLinksJSON, _ := json.Marshal(result.InaccessibleLinks)
    internalLinksJSON, _ := json.Marshal(result.InternalLinks)
    externalLinksJSON, _ := json.Marshal(result.ExternalLinks)

    _, err = db.DB.Exec(`
        UPDATE urls
        SET 
            status = ?, 
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
        "done",
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
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update URL data"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "URL re-analyzed successfully", "result": result})


}

func deleteAnalysisByIDHandler(c *gin.Context) {
    idParam := c.Param("id")
    if idParam == "" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "ID parameter is required"})
        return
    }

    id, err := strconv.Atoi(idParam)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID parameter"})
        return
    }

    userIDVal, _ := c.Get("userID")
    userIDFloat, ok := userIDVal.(float64)
    if !ok {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
        return
    }
    userID := int(userIDFloat)

    var ownerID int
    row := db.DB.QueryRow("SELECT user_id FROM urls WHERE id = ?", id)
    if err := row.Scan(&ownerID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
        return
    } 
 
    if ownerID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to delete this URL"})
        return
    } 

    _, err = db.DB.Exec("DELETE FROM urls WHERE id = ?", id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete URL"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "URL deleted successfully"})
}


func bulkDeleteAnalysesHandler(c *gin.Context) {
    var req BulkUrlReq
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
        return
    }

    if len(req.IDs) == 0 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No IDs provided"})
        return
    }

    fmt.Printf("ids for bulk update: %+v\n", req.IDs)

    userIDVal, _ := c.Get("userID")
    userIDFloat, ok := userIDVal.(float64)
    if !ok {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userID"})
        return
    }
    userID := int(userIDFloat)

    for _, id := range req.IDs {
        var url string
        var ownerID int
        row := db.DB.QueryRow("SELECT user_id, url FROM urls WHERE id = ?", id)
        if err := row.Scan(&ownerID, &url); err != nil {
            fmt.Printf("Failed to fetch URL with ID %d: %v\n", id, err)
            continue
        }

        if ownerID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to update this URL"})
        return
        } 

        result, err := utils.AnalyzeURL(url)
        if err != nil {
            _, _ = db.DB.Exec("UPDATE urls SET status = ? WHERE id = ?", "error", id)
            continue
        }

        headingCountsJSON, _ := json.Marshal(result.HeadingCounts)
        inaccessibleLinksJSON, _ := json.Marshal(result.InaccessibleLinks)
        internalLinksJSON, _ := json.Marshal(result.InternalLinks)
        externalLinksJSON, _ := json.Marshal(result.ExternalLinks)

        _, err = db.DB.Exec(`
            UPDATE urls
            SET 
                status = ?, 
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
            "done",
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

        if err != nil {
            fmt.Printf("Failed to update URL with ID %d: %v\n", id, err)
            continue
        }
    }

    c.JSON(http.StatusOK, gin.H{"message": "Bulk re-analyze triggered"})
}

