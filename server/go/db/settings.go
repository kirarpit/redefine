package db

import (
	"database/sql"
	"strings"
)

const promptTemplateKey = "prompt_template"

// GetPromptTemplate retrieves the prompt template from the database
func GetPromptTemplate() (string, error) {
	db := GetDB()
	var template string

	err := db.QueryRow(`
		SELECT value 
		FROM app_settings 
		WHERE key = ?
	`, promptTemplateKey).Scan(&template)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil // No template found
		}
		return "", err
	}

	return template, nil
}

// SavePromptTemplate saves or updates the prompt template in the database
func SavePromptTemplate(template string) error {
	db := GetDB()

	// Trim whitespace and newline characters from the template
	template = strings.TrimSpace(template)

	// Check if template already exists
	var exists bool
	err := db.QueryRow("SELECT 1 FROM app_settings WHERE key = ?", promptTemplateKey).Scan(&exists)

	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if err == sql.ErrNoRows {
		// Template doesn't exist, insert it
		_, err = db.Exec(`
			INSERT INTO app_settings (key, value)
			VALUES (?, ?)
		`, promptTemplateKey, template)
	} else {
		// Template exists, update it
		_, err = db.Exec(`
			UPDATE app_settings 
			SET value = ?
			WHERE key = ?
		`, template, promptTemplateKey)
	}

	return err
}
