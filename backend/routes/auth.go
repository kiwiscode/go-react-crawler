package routes

import (
	// Import net/http for HTTP status codes
	"net/http"
	// Import os to access environment files
	"os"
	// Import time for token expiration date settings
	"time"

	_ "github.com/go-sql-driver/mysql"
	// Import token for token-based authentication
	"github.com/golang-jwt/jwt/v5"
	"github.com/kiwiscode/sykell-tech-challenge/db"

	"github.com/gin-gonic/gin"
	// Import bcrypt to hash the password
	"golang.org/x/crypto/bcrypt"
)


func AuthRoutes(r *gin.Engine) {
	// Route declarations
	r.POST("/register", registerHandler)
	r.POST("/login", loginHandler)
}




func registerHandler(c *gin.Context) {
	// The expected JSON body from the client must include username, email, and password fields. The password is required to be at least 6 characters long
	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash the password, passing the client’s password as the first parameter and the default cost of 10 as the second parameter
	hashedPass, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		// If there is any problem while hashing the password, send an error to the client
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}


	// Insert a new user with three parameters: username, email, and password. Use the username and email from request body, and convert the password string to the hashed password
	_, err = db.DB.Exec("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", req.Username, req.Email, string(hashedPass))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username or email already exists"})
		return
	}


	// Define userID and set its type to integer
	var userID int64
	// Find the row of the newly created user in the database using the email from the request body, and assign the ID to the userID variable
	err = db.DB.QueryRow("SELECT id FROM users WHERE email = ?", req.Email).Scan(&userID)
	if err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user ID"})
    return
	}



	// Get the JWT_SECRET from the .env file.
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// If the JWT is not defined, send an error
		c.JSON(http.StatusInternalServerError, gin.H{"error": "JWT_SECRET not set"})
		return
	}

	// Set claims for the JWT with user ID, username, and 72-hour expiration
	claims := jwt.MapClaims{
		"user_id":  userID,
		"username": req.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	}

	// Create a new JWT with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// and sign it using the secret key
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	

	// Send an OK status and the token string as a response to the user
	c.JSON(http.StatusOK, gin.H{
		"status": http.StatusOK,
		"token": tokenString,
	})
}

func loginHandler(c *gin.Context) {
	// The expected JSON body from the client must include identified(username or email), and password fields. The password is required
	var req struct {
		Identifier string `json:"identifier" binding:"required"`
		Password   string `json:"password" binding:"required"`
	}

	// Take the body part of the HTTP request as JSON
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create a User structure
	var user struct {
		ID       int64
		Username string
		Email    string
		Password string 
	}


	// Query the users table to find a user by email or username and scan the result into the user struct
	err := db.DB.QueryRow(`
		SELECT id, username, email, password
		FROM users
		WHERE email = ? OR username = ?
	`, req.Identifier, req.Identifier).Scan(
		&user.ID, &user.Username, &user.Email, &user.Password,
	)

	// If unauthorized (i.e., email, username, or password mismatch), notify the client
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Verify whether the entered password matches the hashed password using the bcrypt CompareHashAndPassword method
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		// If the password verification fails, send an unauthorized error again
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Get the JWT_SECRET from the .env file.
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "JWT_SECRET not set"})
		return
	}

	// Set claims with user.id, user.username, and a 72-hour token expiration using the user data scanned after the row query
	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	}

	// Create a new JWT with claims
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// and sign it using the secret key
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// At the end of login, send this JSON; it is needed in the client-side code to perform authentication securely
	c.JSON(http.StatusOK, gin.H{
		"status": http.StatusOK,
		"token":  tokenString,
	})
}

