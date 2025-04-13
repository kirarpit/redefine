package autosuggest

import (
	"testing"
)

func TestSimpleProviderFindSuggestions(t *testing.T) {
	provider := NewSimpleProvider(100) // Small capacity for testing

	// Add test words
	testWords := []string{
		"apple",
		"application",
		"apply",
		"banana",
		"ball",
		"maze",
		"meat",
		"mongoose",
		"mobile",
		"m",
	}

	// Since SimpleProvider doesn't have a direct Insert method, we need to manually add words
	provider.words = testWords
	provider.initialized = true

	// Test cases
	testCases := []struct {
		name     string
		query    string
		limit    int
		expected []string
	}{
		{
			name:     "prefix a with limit 3",
			query:    "a",
			limit:    3,
			expected: []string{"apple", "application", "apply"},
		},
		{
			name:     "prefix ap",
			query:    "ap",
			limit:    5,
			expected: []string{"apple", "application", "apply"},
		},
		{
			name:     "prefix m with limit 5",
			query:    "m",
			limit:    5,
			expected: []string{"m", "maze", "meat", "mobile", "mongoose"},
		},
		{
			name:     "prefix mo",
			query:    "mo",
			limit:    5,
			expected: []string{"mobile", "mongoose"},
		},
		{
			name:     "missing prefix",
			query:    "missing",
			limit:    5,
			expected: []string{},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			results := provider.FindSuggestions(tc.query, tc.limit)
			t.Logf("Query '%s', got results: %v", tc.query, results)

			// Check if we have the right number of results
			if len(results) > tc.limit {
				t.Errorf("Got too many results, expected max %d but got %d", tc.limit, len(results))
			}

			// For these specific tests, we're only checking prefix matches
			// (not doing the full substring search as that behavior differs from RadixProvider)
			// Sort both slices for comparison (different implementations might return in different order)
			if !containsAllExpected(results, tc.expected) {
				t.Errorf("For query '%s' with limit %d, expected all of %v to be in results but got %v",
					tc.query, tc.limit, tc.expected, results)
			}
		})
	}
}

// Helper to check that all expected items are in the results
func containsAllExpected(results []string, expected []string) bool {
	if len(expected) == 0 && len(results) == 0 {
		return true
	}

	if len(expected) > 0 && len(results) == 0 {
		return false
	}

	// Convert results to a map for faster lookup
	resultMap := make(map[string]bool)
	for _, r := range results {
		resultMap[r] = true
	}

	// Check that each expected item is in the results
	for _, e := range expected {
		if !resultMap[e] {
			return false
		}
	}

	return true
}

func TestNewSimpleProvider(t *testing.T) {
	// Test default max words
	provider := NewSimpleProvider(0)
	if provider.maxWords != 10000 {
		t.Errorf("Expected default maxWords to be 10000, got %d", provider.maxWords)
	}

	// Test custom max words
	customMaxWords := 500
	provider = NewSimpleProvider(customMaxWords)
	if provider.maxWords != customMaxWords {
		t.Errorf("Expected maxWords to be %d, got %d", customMaxWords, provider.maxWords)
	}

	// Verify initialization state
	if provider.initialized {
		t.Errorf("New provider should not be initialized")
	}
}
