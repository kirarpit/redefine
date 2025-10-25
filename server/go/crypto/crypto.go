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

func deriveKey() ([]byte, error) {
	saltKey := config.SaltKey()
	if saltKey == "" {
		return nil, errors.New("salt key is not set")
	}

	salt := []byte(saltKey)

	key := pbkdf2.Key([]byte(saltKey), salt, iterations, keyLength, sha256.New)
	return key, nil
}

func EncryptAPIKey(apiKey string) (string, error) {
	if apiKey == "" {
		return "", nil
	}

	key, err := deriveKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(apiKey), nil)

	encryptedData := base64.StdEncoding.EncodeToString(ciphertext)
	return encryptedData, nil
}

func DecryptAPIKey(encryptedAPIKey string) (string, error) {
	if encryptedAPIKey == "" {
		return "", nil
	}

	key, err := deriveKey()
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encryptedAPIKey)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
