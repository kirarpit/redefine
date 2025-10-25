package llm

import (
	"fmt"
	"redefine/server/types"
	"strings"
)

type Provider interface {
	Call(prompt string, model *types.LLMModel) (string, error)

	Name() string
}

type ProviderFactory func() (Provider, error)

var providerFactories = make(map[string]ProviderFactory)

func RegisterProvider(prefix string, factory ProviderFactory) {
	providerFactories[prefix] = factory
}

func GetProvider(model *types.LLMModel) (Provider, error) {

	prefix := model.ID
	if strings.Contains(model.ID, "/") {
		prefix = strings.Split(model.ID, "/")[0]
	}

	factory, ok := providerFactories[prefix]
	if !ok {

		supportedProviders := make([]string, 0, len(providerFactories))
		for p := range providerFactories {
			supportedProviders = append(supportedProviders, p)
		}
		return nil, fmt.Errorf("unsupported model provider: %s. Supported providers are: %s", prefix, strings.Join(supportedProviders, ", "))
	}

	return factory()
}
