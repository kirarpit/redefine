package config

import (
	"os"
)

// DatabasePath returns the path to the SQLite database file
func DatabasePath() string {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./redefine.db"
	}
	return dbPath
}

// SaltKey returns the salt key used for encryption
func SaltKey() string {
	saltKey := os.Getenv("SALT_KEY")
	if saltKey == "" {
		// Default salt key for development - DO NOT USE IN PRODUCTION
		saltKey = "redefine-default-salt-key"
	}
	return saltKey
}

// DefaultPromptTemplatePath returns the path to the default prompt template
func DefaultPromptTemplatePath() string {
	return "./prompts/default_explanation.yaml"
} 