package db

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var DB *sql.DB

func Init() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found or couldn't be loaded. Proceeding with system environment variables.")
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASS"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	var errOpen error
	DB, errOpen = sql.Open("mysql", dsn)
	if errOpen != nil {
		log.Fatalf("Failed to connect to the database: %v", errOpen)
	}

	if err := DB.Ping(); err != nil {
		log.Fatalf("Failed to ping the database: %v", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS users (
	    id INT AUTO_INCREMENT PRIMARY KEY,
	    username VARCHAR(50) NOT NULL UNIQUE,
	    email VARCHAR(100) NOT NULL UNIQUE,
	    password VARCHAR(255) NOT NULL,
	    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(query)
	if err != nil {
		log.Fatalf("Failed to create users table: %v", err)
	}

	fmt.Println("Successfully connected to MySQL database and ensured users table exists")
}
