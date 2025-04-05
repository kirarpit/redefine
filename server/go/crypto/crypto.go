package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"redefine/server/config"

	"golang.org/x/crypto/pbkdf2"
)

const (
	keyLength  = 32
	iterations = 10000
)

// deriveKey derives an encryption key from the salt key
func deriveKey() ([]byte, error) {
	saltKey := config.SaltKey()
	if saltKey == "" {
		return nil, errors.New("salt key is not set")
	}

	// Use the salt key itself as the salt
	salt := []byte(saltKey)

	// Derive a key using PBKDF2
	key := pbkdf2.Key([]byte(saltKey), salt, iterations, keyLength, sha256.New)
	return key, nil
}

// EncryptAPIKey encrypts an API key
func EncryptAPIKey(apiKey string) (string, error) {
	if apiKey == "" {
		return "", nil
	}

	key, err := deriveKey()
	if err != nil {
		return "", err
	}

	// Create a new AES cipher block
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Create a new GCM cipher mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Create a nonce
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	// Encrypt the data
	ciphertext := gcm.Seal(nonce, nonce, []byte(apiKey), nil)

	// Encode to base64
	encryptedData := base64.StdEncoding.EncodeToString(ciphertext)
	return encryptedData, nil
}

// DecryptAPIKey decrypts an API key
func DecryptAPIKey(encryptedAPIKey string) (string, error) {
	if encryptedAPIKey == "" {
		return "", nil
	}

	key, err := deriveKey()
	if err != nil {
		return "", err
	}

	// Create a new AES cipher block
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	// Create a new GCM cipher mode
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Decode from base64
	ciphertext, err := base64.StdEncoding.DecodeString(encryptedAPIKey)
	if err != nil {
		return "", err
	}

	// Extract the nonce
	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	// Decrypt the data
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
