package llm

import (
	"fmt"
	"redefine/server/types"
	"strings"
)

// Provider interface defines the contract that all LLM providers must implement
type Provider interface {
	// Call sends a prompt to the LLM and returns the response
	// Simplified to only take the model object and prompt
	Call(prompt string, model *types.LLMModel) (string, error)

	// Name returns the name of the provider
	Name() string
}

// ProviderFactory is a function type that creates a provider from a model configuration
type ProviderFactory func() (Provider, error)

// registry of provider factories
var providerFactories = make(map[string]ProviderFactory)

// RegisterProvider registers a new provider factory
func RegisterProvider(prefix string, factory ProviderFactory) {
	providerFactories[prefix] = factory
}

// GetProvider returns a provider for the given model
func GetProvider(model *types.LLMModel) (Provider, error) {
	// Extract provider prefix from model ID
	prefix := model.ID
	if strings.Contains(model.ID, "/") {
		prefix = strings.Split(model.ID, "/")[0]
	}

	// Look up provider factory
	factory, ok := providerFactories[prefix]
	if !ok {
		// Get a list of all supported providers
		supportedProviders := make([]string, 0, len(providerFactories))
		for p := range providerFactories {
			supportedProviders = append(supportedProviders, p)
		}
		return nil, fmt.Errorf("unsupported model provider: %s. Supported providers are: %s", prefix, strings.Join(supportedProviders, ", "))
	}

	// Create provider instance
	return factory()
}
