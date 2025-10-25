package db

import (
	"database/sql"
	"fmt"
	"log"
	"redefine/server/config"
	"sync"

	_ "modernc.org/sqlite"
)

var (
	db   *sql.DB
	once sync.Once
)

func Initialize() error {
	var initErr error
	once.Do(func() {
		dbPath := config.DatabasePath()
		log.Printf("Opening SQLite database at %s", dbPath)

		database, err := sql.Open("sqlite", dbPath)
		if err != nil {
			initErr = fmt.Errorf("failed to open database: %w", err)
			return
		}

		if err := database.Ping(); err != nil {
			initErr = fmt.Errorf("failed to ping database: %w", err)
			return
		}

		if err := createTables(database); err != nil {
			initErr = fmt.Errorf("failed to create tables: %w", err)
			return
		}

		db = database
	})

	return initErr
}

func GetDB() *sql.DB {
	return db
}

func createTables(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS flashcards (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			query TEXT NOT NULL,
			front TEXT NOT NULL,
			back TEXT NOT NULL,
			exported_at TEXT NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create flashcards table: %w", err)
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS llm_models (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			api_key TEXT NOT NULL,
			api_endpoint TEXT
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create llm_models table: %w", err)
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS app_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create app_settings table: %w", err)
	}

	return nil
}

func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}
