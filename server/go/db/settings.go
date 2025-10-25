package db

import (
	"database/sql"
	"fmt"
	"strings"
)

func GetPromptTemplateKey(promptType string) string {
	if promptType == "" {
		promptType = "general"
	}
	return fmt.Sprintf("prompt_template_%s", promptType)
}

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
			return "", nil
		}
		return "", err
	}

	return template, nil
}

func SavePromptTemplate(template string, promptType string) error {
	db := GetDB()

	template = strings.TrimSpace(template)
	promptKey := GetPromptTemplateKey(promptType)

	var exists bool
	err := db.QueryRow("SELECT 1 FROM app_settings WHERE key = ?", promptKey).Scan(&exists)

	if err != nil && err != sql.ErrNoRows {
		return err
	}

	if err == sql.ErrNoRows {
		_, err = db.Exec(`
			INSERT INTO app_settings (key, value)
			VALUES (?, ?)
		`, promptKey, template)
	} else {
		_, err = db.Exec(`
			UPDATE app_settings
			SET value = ?
			WHERE key = ?
		`, template, promptKey)
	}

	return err
}
