package db

import (
	"database/sql"
	"redefine/server/crypto"
	"redefine/server/models"
)

// GetLLMModels retrieves all LLM models from the database
func GetLLMModels() ([]models.LLMModel, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT id, name, api_key, api_endpoint 
		FROM llm_models
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var llmModels []models.LLMModel
	for rows.Next() {
		var m models.LLMModel
		var apiEndpoint sql.NullString
		if err := rows.Scan(&m.ID, &m.Name, &m.APIKey, &apiEndpoint); err != nil {
			return nil, err
		}

		// Decrypt API key
		decryptedKey, err := crypto.DecryptAPIKey(m.APIKey)
		if err != nil {
			return nil, err
		}
		m.APIKey = decryptedKey

		// Set API endpoint if it exists
		if apiEndpoint.Valid {
			m.APIEndpoint = apiEndpoint.String
		}

		llmModels = append(llmModels, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return llmModels, nil
}

// GetLLMModelByID retrieves a single LLM model by ID
func GetLLMModelByID(id string) (*models.LLMModel, error) {
	db := GetDB()
	var model models.LLMModel
	var apiEndpoint sql.NullString

	err := db.QueryRow(`
		SELECT id, name, api_key, api_endpoint 
		FROM llm_models 
		WHERE id = ?
	`, id).Scan(&model.ID, &model.Name, &model.APIKey, &apiEndpoint)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // Model not found
		}
		return nil, err
	}

	// Decrypt API key
	decryptedKey, err := crypto.DecryptAPIKey(model.APIKey)
	if err != nil {
		return nil, err
	}
	model.APIKey = decryptedKey

	// Set API endpoint if it exists
	if apiEndpoint.Valid {
		model.APIEndpoint = apiEndpoint.String
	}

	return &model, nil
}

// AddLLMModel adds or updates an LLM model in the database
func AddLLMModel(model models.LLMModel) (*models.LLMModel, error) {
	// Encrypt API key before storing
	encryptedKey, err := crypto.EncryptAPIKey(model.APIKey)
	if err != nil {
		return nil, err
	}

	db := GetDB()

	// Check if model already exists
	var exists bool
	err = db.QueryRow("SELECT 1 FROM llm_models WHERE id = ?", model.ID).Scan(&exists)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if err == sql.ErrNoRows {
		// Model doesn't exist, insert it
		_, err = db.Exec(`
			INSERT INTO llm_models (id, name, api_key, api_endpoint)
			VALUES (?, ?, ?, ?)
		`, model.ID, model.Name, encryptedKey, model.APIEndpoint)
	} else {
		// Model exists, update it
		_, err = db.Exec(`
			UPDATE llm_models 
			SET name = ?, api_key = ?, api_endpoint = ?
			WHERE id = ?
		`, model.Name, encryptedKey, model.APIEndpoint, model.ID)
	}

	if err != nil {
		return nil, err
	}

	// Return the model with the unencrypted key
	return &model, nil
}

// DeleteLLMModel deletes an LLM model from the database
func DeleteLLMModel(id string) (bool, error) {
	db := GetDB()
	result, err := db.Exec("DELETE FROM llm_models WHERE id = ?", id)
	if err != nil {
		return false, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	return rowsAffected > 0, nil
}
