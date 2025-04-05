package db

import (
	"redefine/server/models"
)

// GetFlashcards retrieves all flashcards from the database
func GetFlashcards() ([]models.Flashcard, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT query, front, back, exported_at 
		FROM flashcards
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flashcards []models.Flashcard
	for rows.Next() {
		var f models.Flashcard
		if err := rows.Scan(&f.Query, &f.Front, &f.Back, &f.ExportedAt); err != nil {
			return nil, err
		}
		flashcards = append(flashcards, f)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return flashcards, nil
}

// AddFlashcard adds a new flashcard to the database
func AddFlashcard(flashcard models.Flashcard) (*models.Flashcard, error) {
	db := GetDB()
	result, err := db.Exec(`
		INSERT INTO flashcards (query, front, back, exported_at)
		VALUES (?, ?, ?, ?)
	`, flashcard.Query, flashcard.Front, flashcard.Back, flashcard.ExportedAt)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	// Flashcard ID is not used in the frontend, just confirming insertion succeeded
	_ = id

	// Return the added flashcard
	return &flashcard, nil
}

// DeleteFlashcard deletes a flashcard from the database
func DeleteFlashcard(query, front, back string) (bool, error) {
	db := GetDB()
	result, err := db.Exec(`
		DELETE FROM flashcards 
		WHERE query = ? AND front = ? AND back = ?
	`, query, front, back)
	if err != nil {
		return false, err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	return rowsAffected > 0, nil
} 