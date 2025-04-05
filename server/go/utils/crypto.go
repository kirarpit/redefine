package utils

import (
	"redefine/server/crypto"
)

// EncryptAPIKey encrypts an API key - delegated to crypto package
func EncryptAPIKey(apiKey string) (string, error) {
	return crypto.EncryptAPIKey(apiKey)
}

// DecryptAPIKey decrypts an API key - delegated to crypto package
func DecryptAPIKey(encryptedAPIKey string) (string, error) {
	return crypto.DecryptAPIKey(encryptedAPIKey)
}
