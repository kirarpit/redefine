package autosuggest

import (
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"testing"
)

// Helper function to create a test file with sample words
func createTestWordFile(t *testing.T) string {
	// Create a temp directory for tests
	testDir := filepath.Join(os.TempDir(), "redefine-test")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		t.Fatalf("Failed to create test directory: %v", err)
	}

	// Create a test file with sample words
	testFile := filepath.Join(testDir, "test_words.txt")
	f, err := os.Create(testFile)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}
	defer f.Close()

	// Sample words
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
		"supercalifragilisticexpialidocious", // Long word test
	}

	// Write sample words to the file
	for _, word := range testWords {
		f.WriteString(word + "\n")
	}

	return testFile
}

func TestMmapProviderLoadAndFindSuggestions(t *testing.T) {
	// Create a test file with sample words
	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	// Create a new MmapProvider
	provider := NewMmapProvider()

	// Load the test data
	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

	// Verify that the provider was initialized
	if !provider.initialized {
		t.Fatal("Provider was not initialized")
	}

	// Define test cases
	testCases := []struct {
		name     string
		query    string
		limit    int
		expected []string
	}{
		{
			name:     "Single character query",
			query:    "a",
			limit:    5,
			expected: []string{"apple", "application", "apply"},
		},
		{
			name:     "Two character query",
			query:    "ap",
			limit:    5,
			expected: []string{"apple", "application", "apply"},
		},
		{
			name:     "Single character query with multiple matches",
			query:    "m",
			limit:    5,
			expected: []string{"m", "maze", "meat", "mobile", "mongoose"},
		},
		{
			name:     "Two character query with multiple matches",
			query:    "mo",
			limit:    5,
			expected: []string{"mobile", "mongoose"},
		},
		{
			name:     "Query with no matches",
			query:    "xyz",
			limit:    5,
			expected: []string{},
		},
		{
			name:     "Long word test",
			query:    "super",
			limit:    1,
			expected: []string{"supercalifragilisticexpialidocious"},
		},
	}

	// Run tests
	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			results := provider.FindSuggestions(tc.query, tc.limit)
			t.Logf("Query '%s', got results: %v", tc.query, results)

			// Check if we have the right number of results
			if len(results) > tc.limit {
				t.Errorf("Got too many results, expected max %d but got %d", tc.limit, len(results))
			}

			// Sort both slices for comparison
			sort.Strings(results)
			sort.Strings(tc.expected)

			if !reflect.DeepEqual(results, tc.expected) {
				t.Errorf("For query '%s' with limit %d,\nexpected: %v\nbut got: %v",
					tc.query, tc.limit, tc.expected, results)
			}
		})
	}
}

func TestMmapProviderCleanup(t *testing.T) {
	// Create a test file with sample words
	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	// Create a new MmapProvider
	provider := NewMmapProvider()

	// Load the test data
	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

	// Verify that resources were allocated
	if provider.dataFile == nil {
		t.Error("dataFile was not allocated")
	}
	if provider.dataMmap == nil {
		t.Error("dataMmap was not allocated")
	}
	if len(provider.prefixIndex) == 0 {
		t.Error("prefixIndex was not populated")
	}

	// Test the cleanup function
	provider.cleanup()

	// Verify that resources were released
	if provider.dataFile != nil {
		t.Error("dataFile was not released")
	}
	if provider.dataMmap != nil {
		t.Error("dataMmap was not released")
	}
	if len(provider.prefixIndex) != 0 {
		t.Error("prefixIndex was not cleared")
	}
	if provider.initialized {
		t.Error("Provider is still marked as initialized")
	}
}

func TestPadWord(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Short word",
			input:    "test",
			expected: "test                    ",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "                        ",
		},
		{
			name:     "Word exactly WordLen characters",
			input:    "abcdefghijklmnopqrstuvwx", // 24 characters
			expected: "abcdefghijklmnopqrstuvwx",
		},
		{
			name:     "Word longer than WordLen",
			input:    "abcdefghijklmnopqrstuvwxyz", // 26 characters
			expected: "abcdefghijklmnopqrstuvw*",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := padWord(tc.input)
			if result != tc.expected {
				t.Errorf("Expected '%s' but got '%s'", tc.expected, result)
			}
		})
	}
}
