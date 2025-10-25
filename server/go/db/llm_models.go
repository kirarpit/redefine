package db

import (
	"database/sql"
	"redefine/server/crypto"
	"redefine/server/types"
)

func GetLLMModels() ([]types.LLMModel, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT id, name, api_key, api_endpoint
		FROM llm_models
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var llmModels []types.LLMModel
	for rows.Next() {
		var m types.LLMModel
		var apiEndpoint sql.NullString
		if err := rows.Scan(&m.ID, &m.Name, &m.APIKey, &apiEndpoint); err != nil {
			return nil, err
		}

		decryptedKey, err := crypto.DecryptAPIKey(m.APIKey)
		if err != nil {
			return nil, err
		}
		m.APIKey = decryptedKey

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

func GetLLMModelByID(id string) (*types.LLMModel, error) {
	db := GetDB()
	var model types.LLMModel
	var apiEndpoint sql.NullString

	err := db.QueryRow(`
		SELECT id, name, api_key, api_endpoint
		FROM llm_models
		WHERE id = ?
	`, id).Scan(&model.ID, &model.Name, &model.APIKey, &apiEndpoint)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	decryptedKey, err := crypto.DecryptAPIKey(model.APIKey)
	if err != nil {
		return nil, err
	}
	model.APIKey = decryptedKey

	if apiEndpoint.Valid {
		model.APIEndpoint = apiEndpoint.String
	}

	return &model, nil
}

func AddLLMModel(model types.LLMModel) (*types.LLMModel, error) {
	encryptedKey, err := crypto.EncryptAPIKey(model.APIKey)
	if err != nil {
		return nil, err
	}

	db := GetDB()

	var exists bool
	err = db.QueryRow("SELECT 1 FROM llm_models WHERE id = ?", model.ID).Scan(&exists)

	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	if err == sql.ErrNoRows {
		_, err = db.Exec(`
			INSERT INTO llm_models (id, name, api_key, api_endpoint)
			VALUES (?, ?, ?, ?)
		`, model.ID, model.Name, encryptedKey, model.APIEndpoint)
	} else {
		_, err = db.Exec(`
			UPDATE llm_models
			SET name = ?, api_key = ?, api_endpoint = ?
			WHERE id = ?
		`, model.Name, encryptedKey, model.APIEndpoint, model.ID)
	}

	if err != nil {
		return nil, err
	}

	return &model, nil
}

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
