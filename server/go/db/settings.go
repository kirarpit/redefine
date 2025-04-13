package db

import (
	"database/sql"
	"fmt"
	"strings"
)

// GetPromptTemplateKey returns the key used for storing a prompt template of a specific type
func GetPromptTemplateKey(promptType string) string {
	if promptType == "" {
		promptType = "general"
	}
	return fmt.Sprintf("prompt_template_%s", promptType)
}

// GetPromptTemplate retrieves the prompt template of the specified type from the database
func GetPromptTemplate(promptType string) (string, error) {
	db := GetDB()
	var template string

	promptKey := GetPromptTemplateKey(promptType)

	err := db.QueryRow(`
		SELECT value 
		FROM app_settings 
		WHERE key = ?
	`, promptKey).Scan(&template)

	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil // No template found
		}
		return "", err
	}

	return template, nil
}

// SavePromptTemplate saves or updates the prompt template of the specified type in the database
func SavePromptTemplate(template string, promptType string) error {
	db := GetDB()

	// Trim whitespace and newline characters from the template
	template = strings.TrimSpace(template)
	promptKey := GetPromptTemplateKey(promptType)

	// Check if template already exists
	var exists bool
	err := db.QueryRow("SELECT 1 FROM app_settings WHERE key = ?", promptKey).Scan(&exists)

	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if err == sql.ErrNoRows {
		// Template doesn't exist, insert it
		_, err = db.Exec(`
			INSERT INTO app_settings (key, value)
			VALUES (?, ?)
		`, promptKey, template)
	} else {
		// Template exists, update it
		_, err = db.Exec(`
			UPDATE app_settings 
			SET value = ?
			WHERE key = ?
		`, template, promptKey)
	}

	return err
}
