package config

import "os"

func DatabasePath() string {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./redefine.db"
	}
	return dbPath
}

func SaltKey() string {
	saltKey := os.Getenv("SALT_KEY")
	if saltKey == "" {
		saltKey = "redefine-default-salt-key"
	}
	return saltKey
}

func DefaultPromptTemplatePath() string {
	return "./prompts/default_explanation.yaml"
}

func AnkiConnectURL() string {
	if url := os.Getenv("ANKI_CONNECT_URL"); url != "" {
		return url
	}
	return "http://127.0.0.1:8765"
}
