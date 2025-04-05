package utils

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"redefine/server/config"

	"gopkg.in/yaml.v3"
)

// PromptData represents the structure of the prompt template file
type PromptData struct {
	Prompt struct {
		Template string `yaml:"template"`
	} `yaml:"prompt"`
}

// LoadPromptTemplate loads the default prompt template from the YAML file
func LoadPromptTemplate() (string, error) {
	// Get the project root directory
	rootDir, err := os.Getwd()
	if err != nil {
		return "", fmt.Errorf("failed to get working directory: %w", err)
	}

	// Try to find the prompt template file
	paths := []string{
		filepath.Join(rootDir, config.DefaultPromptTemplatePath()),
		filepath.Join(rootDir, "prompts", "default_explanation.yaml"),
		filepath.Join(rootDir, "..", "python", "app", "prompts", "default_explanation.yaml"),
	}

	var templateFile string
	for _, path := range paths {
		if _, err := os.Stat(path); err == nil {
			templateFile = path
			break
		}
	}

	if templateFile == "" {
		return "", fmt.Errorf("prompt template file not found")
	}

	// Read the YAML file
	data, err := ioutil.ReadFile(templateFile)
	if err != nil {
		return "", fmt.Errorf("failed to read prompt template file: %w", err)
	}

	// Parse the YAML
	var promptData PromptData
	if err := yaml.Unmarshal(data, &promptData); err != nil {
		return "", fmt.Errorf("failed to parse prompt template file: %w", err)
	}

	return promptData.Prompt.Template, nil
} 