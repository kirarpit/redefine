package autosuggest

import (
	"reflect"
	"testing"
)

func TestRadixProviderInsertAndFindPrefix(t *testing.T) {
	provider := NewRadixProvider()

	// Insert test words
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
		"m", // Include single character word
	}

	for _, word := range testWords {
		provider.Insert(word)
	}

	// Test cases
	testCases := []struct {
		prefix   string
		limit    int
		expected []string
	}{
		{
			prefix:   "a",
			limit:    5,
			expected: []string{"apple", "application", "apply"},
		},
		{
			prefix:   "ap",
			limit:    5,
			expected: []string{"apple", "application", "apply"},
		},
		{
			prefix:   "m",
			limit:    5,
			expected: []string{"m", "maze", "meat", "mobile", "mongoose"},
		},
		{
			prefix:   "mo",
			limit:    5,
			expected: []string{"mobile", "mongoose"},
		},
		{
			prefix:   "missing",
			limit:    5,
			expected: []string{},
		},
	}

	for _, tc := range testCases {
		t.Run("prefix: "+tc.prefix, func(t *testing.T) {
			results := provider.findWordsWithPrefix(tc.prefix, tc.limit)
			t.Logf("Query '%s', got results: %v", tc.prefix, results)

			// Sort both slices for comparison
			if !reflect.DeepEqual(sortedCopy(results), sortedCopy(tc.expected)) {
				t.Errorf("For prefix '%s' with limit %d, expected %v but got %v",
					tc.prefix, tc.limit, tc.expected, results)
			}
		})
	}
}

// Helper function for sorted comparison
func sortedCopy(strs []string) []string {
	// For simplicity, using manual bubble sort as we don't need to import sort package
	// In a real test, you might use sort.Strings()
	result := make([]string, len(strs))
	copy(result, strs)

	for i := 0; i < len(result); i++ {
		for j := i + 1; j < len(result); j++ {
			if result[i] > result[j] {
				result[i], result[j] = result[j], result[i]
			}
		}
	}
	return result
}

// Test the combined search function
func TestRadixProviderFindSuggestions(t *testing.T) {
	provider := NewRadixProvider()

	// Insert test words
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

	for _, word := range testWords {
		provider.Insert(word)
	}

	// Test cases
	testCases := []struct {
		query    string
		limit    int
		expected []string
	}{
		{
			query:    "m",
			limit:    5,
			expected: []string{"m", "maze", "meat", "mobile", "mongoose"},
		},
		{
			query:    "mo",
			limit:    5,
			expected: []string{"mobile", "mongoose"},
		},
	}

	for _, tc := range testCases {
		t.Run("query: "+tc.query, func(t *testing.T) {
			results := provider.FindSuggestions(tc.query, tc.limit)
			t.Logf("Query '%s', got results: %v", tc.query, results)

			// Sort both slices for comparison
			if !reflect.DeepEqual(sortedCopy(results), sortedCopy(tc.expected)) {
				t.Errorf("For query '%s' with limit %d, expected %v but got %v",
					tc.query, tc.limit, tc.expected, results)
			}
		})
	}
}
