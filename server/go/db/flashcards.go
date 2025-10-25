package db

import "redefine/server/types"

func GetFlashcards() ([]types.Flashcard, error) {
	db := GetDB()
	rows, err := db.Query(`
		SELECT query, front, back, exported_at
		FROM flashcards
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var flashcards []types.Flashcard
	for rows.Next() {
		var f types.Flashcard
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

func AddFlashcard(flashcard types.Flashcard) (*types.Flashcard, error) {
	exists, err := FlashcardExists(flashcard.Front, flashcard.Back, flashcard.Query)
	if err != nil {
		return nil, err
	}

	if exists {
		return &flashcard, nil
	}

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

	_ = id

	return &flashcard, nil
}

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

func FlashcardExists(front, back, query string) (bool, error) {
	db := GetDB()
	var count int
	err := db.QueryRow(`
		SELECT COUNT(*) FROM flashcards
		WHERE front = ? AND back = ? AND query = ?
	`, front, back, query).Scan(&count)

	if err != nil {
		return false, err
	}

	return count > 0, nil
}
