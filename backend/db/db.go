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
	// Load environment variables from .env file, if available
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found or couldn't be loaded. Proceeding with system environment variables.")
	}

	// Build the MySQL DSN string from environment variables
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	// Open database connection
	var errOpen error
	DB, errOpen = sql.Open("mysql", dsn)
	if errOpen != nil {
		log.Fatalf("Failed to connect to the database: %v", errOpen)
	}

	// Ping DB to verify connection is alive
	if err := DB.Ping(); err != nil {
		log.Fatalf("Failed to ping the database: %v", err)
	}

	// Create 'users' table if it does not exist
	queryUsers := `
	CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`

	_, err = DB.Exec(queryUsers)
	if err != nil {
		log.Fatalf("Failed to create users table: %v", err)
	}

	// Create 'urls' table if it does not exist, with foreign key referencing users
	queryUrls := `
	CREATE TABLE IF NOT EXISTS urls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    url VARCHAR(2048) NOT NULL,
    status ENUM('queued', 'running', 'done', 'error') DEFAULT 'queued',
	should_pause BOOLEAN DEFAULT FALSE,
    title VARCHAR(255),
    html_version VARCHAR(50),
    heading_counts JSON,
    internal_links_count INT DEFAULT 0,
    external_links_count INT DEFAULT 0,
    has_login_form BOOLEAN DEFAULT FALSE,
    inaccessible_links_count INT DEFAULT 0,
    inaccessible_links JSON,
    internal_links JSON,
    external_links JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	);
	`

	_, err = DB.Exec(queryUrls)
	if err != nil {
		log.Fatalf("Failed to create urls table: %v", err)
	}

	fmt.Println("Successfully connected to MySQL database and ensured tables (users, urls) exists")
}
