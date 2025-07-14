package auth

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuthMiddleware() gin.HandlerFunc {

	// Get the JWT_SECRET from the .env file.
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Panic if JWT secret is not set
		panic("JWT_SECRET environment variable not set")
	}

	return func(c *gin.Context) {
		// Get the Authorization header from the client request
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			// If Authorization header is missing, respond with 401 Unauthorized
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			return
		}

		// Split the Authorization header into two parts and get the token from the second part
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			// If format is wrong, respond with 401 Unauthorized
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}

		// Extract the token part
		tokenStr := parts[1]

		// Parse and validate the JWT token
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method is HMACC
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenMalformed
			}
			// Return the secret key
			return []byte(secret), nil
		})

		// If parsing or validation fails, respond with 401 Unauthorized
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Extract claims from token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			// If claims are invalid, respond with 401 Unauthorized
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		// Check if user_id claim exists and is not empty
		userID, ok := claims["user_id"]
		if !ok || userID == "" {
			// If user_id missing, respond with 401 Unauthorized
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "user_id not found in token"})
			return
		}

		// Add userID to Gin context
		c.Set("userID", userID)

		// Continue with the request...
		c.Next()
	}
}
