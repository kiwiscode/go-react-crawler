package routes

import (
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/kiwiscode/sykell-tech-challenge/db"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)


func AuthRoutes(r *gin.Engine) {
	r.POST("/register", registerHandler)
	r.POST("/login", loginHandler)
}




func registerHandler(c *gin.Context) {
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPass, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	_, err = db.DB.Exec("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", req.Username, req.Email, string(hashedPass))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username or email already exists"})
		return
	}

	var userID int64
	err = db.DB.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&userID)
	if err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user ID"})
    return
	}


	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "JWT_SECRET not set"})
		return
	}

	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": req.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	

	c.JSON(http.StatusOK, gin.H{
		"status": http.StatusOK,
		"token": tokenString,
	})
}

func loginHandler(c *gin.Context) {
	var req struct {
		Identifier string `json:"identifier" binding:"required"`
		Password   string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}



	var user struct {
		ID       int64
		Username string
		Email    string
		Password string 
	}


	err := db.DB.QueryRow(`
		SELECT id, username, email, password
		FROM users
		WHERE email = ? OR username = ?
	`, req.Identifier, req.Identifier).Scan(
		&user.ID, &user.Username, &user.Email, &user.Password,
	)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "JWT_SECRET not set"})
		return
	}

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": http.StatusOK,
		"token":  tokenString,
	})
}

