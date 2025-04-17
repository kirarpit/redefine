package autosuggest

import (
	"encoding/binary"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
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

			// Compare the slice equality
			match := true
			if len(results) != len(tc.expected) {
				match = false
			} else {
				for i := range results {
					if results[i] != tc.expected[i] {
						match = false
						break
					}
				}
			}

			if !match {
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
	if provider.indexData == nil {
		t.Error("indexData was not allocated")
	}
	if len(provider.indexOffsets) == 0 {
		t.Error("indexOffsets was not populated")
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
	if provider.indexData != nil {
		t.Error("indexData was not released")
	}
	if len(provider.indexOffsets) != 0 {
		t.Error("indexOffsets was not cleared")
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

func TestCompressAndQueryIndex(t *testing.T) {
	// Create a sample index
	testIndex := map[string][2]int64{
		"a":   {0, 100},
		"ap":  {0, 50},
		"app": {0, 20},
		"b":   {100, 200},
		"ba":  {100, 150},
		"m":   {200, 300},
		"mo":  {200, 250},
	}

	provider := NewMmapProvider()
	compressed := provider.compressIndex(testIndex)

	// Ensure we got some bytes back
	if len(compressed) == 0 {
		t.Fatal("Compression produced empty result")
	}

	// Build offset table
	offsets, err := provider.buildOffsetTable(compressed)
	if err != nil {
		t.Fatalf("Failed to build offset table: %v", err)
	}

	// Set up the provider with the compressed data
	provider.indexData = compressed
	provider.indexOffsets = offsets

	// Test queries
	tests := []struct {
		prefix          string
		expectedMatches bool
	}{
		{"a", true},   // Should find an entry for "a"
		{"ap", true},  // Should find an entry for "ap"
		{"app", true}, // Should find an entry for "app"
		{"b", true},   // Should find an entry for "b"
		{"m", true},   // Should find an entry for "m"
		{"z", false},  // Should find nothing
	}

	for _, tc := range tests {
		t.Run(tc.prefix, func(t *testing.T) {
			record, err := provider.queryCompressedIndex(tc.prefix)

			if tc.expectedMatches {
				if err != nil {
					t.Fatalf("Failed to query index: %v", err)
				}

				if record.Prefix == "" {
					t.Errorf("For prefix '%s' expected to find a record, but got empty prefix", tc.prefix)
				}

				// Verify the prefix matches or starts with our search prefix
				if !strings.HasPrefix(record.Prefix, tc.prefix) {
					t.Errorf("For prefix '%s' got record with prefix '%s', which doesn't match",
						tc.prefix, record.Prefix)
				}
			} else {
				// For prefixes we don't expect to match, the record should have an empty prefix
				if record.Prefix != "" {
					t.Errorf("For prefix '%s' expected empty prefix, but got: %+v", tc.prefix, record)
				}
			}
		})
	}
}

func BenchmarkMmapSearch(b *testing.B) {
	// Create a test file with enough words to benchmark
	testDir := filepath.Join(os.TempDir(), "redefine-bench")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		b.Fatalf("Failed to create test directory: %v", err)
	}
	defer os.RemoveAll(testDir)

	// Create a test file with sample words (more words for a realistic benchmark)
	testFile := filepath.Join(testDir, "bench_words.txt")
	f, err := os.Create(testFile)
	if err != nil {
		b.Fatalf("Failed to create test file: %v", err)
	}

	// Generate words for benchmarking (a-z + aa-zz)
	const alphabet = "abcdefghijklmnopqrstuvwxyz"
	for i := 0; i < len(alphabet); i++ {
		f.WriteString(string(alphabet[i]) + "\n")
		for j := 0; j < len(alphabet); j++ {
			f.WriteString(string(alphabet[i]) + string(alphabet[j]) + "\n")
		}
	}
	f.Close()

	// Create a new MmapProvider
	provider := NewMmapProvider()

	// Load the test data
	if err := provider.LoadData(testFile); err != nil {
		b.Fatalf("Failed to load test data: %v", err)
	}

	// Measure memory before tests
	var m1, m2 runtime.MemStats
	runtime.ReadMemStats(&m1)

	// Benchmark the search
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		// Use different prefixes to avoid just testing cache
		prefix := string(alphabet[i%len(alphabet)])
		provider.FindSuggestions(prefix, 10)
	}

	// Measure memory after tests
	runtime.ReadMemStats(&m2)

	b.ReportMetric(float64(m2.TotalAlloc-m1.TotalAlloc)/1024/1024, "MB_total")
	b.ReportMetric(float64(m2.HeapAlloc-m1.HeapAlloc)/1024/1024, "MB_heap")
}

func TestMemoryUsage(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping memory test in short mode")
	}

	// Create a test file with sample words
	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	// Create a new MmapProvider
	provider := NewMmapProvider()

	// Load the test data
	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

	// Get memory stats after loading data
	var m runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m)

	t.Logf("Memory usage after loading: %v KB", m.HeapAlloc/1024)
	t.Logf("Total allocated memory: %v KB", m.TotalAlloc/1024)

	// Perform some searches to simulate usage
	for i := 0; i < 100; i++ {
		provider.FindSuggestions("a", 10)
		provider.FindSuggestions("b", 10)
		provider.FindSuggestions("m", 10)
	}

	// Get memory stats after searching
	runtime.GC()
	runtime.ReadMemStats(&m)

	t.Logf("Memory usage after searching: %v KB", m.HeapAlloc/1024)
	t.Logf("Total allocated memory: %v KB", m.TotalAlloc/1024)
}

// TestCompressIndexAndReadRecord tests the compression of a dummy index
// and verifies that records can be properly read back
func TestCompressIndexAndReadRecord(t *testing.T) {
	// Create a dummy index with known values
	dummyIndex := map[string][2]int64{
		"a":    {0, 100},
		"ab":   {0, 50},
		"abc":  {0, 30},
		"b":    {100, 200},
		"bc":   {120, 180},
		"xyz":  {500, 600},
		"long": {1000, 2000},
	}

	// Create provider and compress the index
	provider := NewMmapProvider()
	compressedData := provider.compressIndex(dummyIndex)

	// Ensure the compressed data is not empty
	if len(compressedData) == 0 {
		t.Fatal("Compression produced empty result")
	}

	// Check if we can read the number of records correctly
	numRecords := int(binary.LittleEndian.Uint64(compressedData[:8]))
	if numRecords != len(dummyIndex) {
		t.Errorf("Expected %d records, but header indicates %d records", len(dummyIndex), numRecords)
	}

	// Try to read each record manually
	recordsRead := make(map[string]IndexRecord)
	offset := 8 // Skip the 8-byte header

	for i := 0; i < numRecords; i++ {
		record, next, err := provider.readRecord(compressedData, offset)
		if err != nil {
			t.Fatalf("Failed to read record at offset %d: %v", offset, err)
		}

		// Store the record
		recordsRead[record.Prefix] = record

		// Move to the next record
		offset = next
	}

	// Verify all records were read correctly
	if len(recordsRead) != len(dummyIndex) {
		t.Errorf("Expected to read %d records, but got %d", len(dummyIndex), len(recordsRead))
	}

	// Verify specific records
	expectedRecords := []struct {
		prefix string
		start  uint64
		end    uint64
	}{
		{"a", 0, 100},
		{"ab", 0, 50},
		{"abc", 0, 30},
		{"b", 100, 200},
		{"bc", 120, 180},
		{"xyz", 500, 600},
		{"long", 1000, 2000},
	}

	for _, expected := range expectedRecords {
		record, ok := recordsRead[expected.prefix]
		if !ok {
			t.Errorf("Missing record for prefix '%s'", expected.prefix)
			continue
		}

		if record.Start != expected.start || record.End != expected.end {
			t.Errorf("For prefix '%s': expected range [%d,%d] but got [%d,%d]",
				expected.prefix, expected.start, expected.end, record.Start, record.End)
		}
	}

	// Test reading a record at specific offset
	for offset, prefix := range map[int]string{
		8: "a", // First record should be at offset 8 (after header)
	} {
		record, _, err := provider.readRecord(compressedData, offset)
		if err != nil {
			t.Errorf("Failed to read record at known offset %d: %v", offset, err)
			continue
		}

		if record.Prefix != prefix {
			t.Errorf("Expected prefix '%s' at offset %d, but got '%s'", prefix, offset, record.Prefix)
		}
	}

	// Test record decompression to ensure the entire cycle works
	offsets, err := provider.buildOffsetTable(compressedData)
	if err != nil {
		t.Fatalf("Failed to build offset table: %v", err)
	}

	if len(offsets) != numRecords {
		t.Errorf("Expected %d offsets in offset table, but got %d", numRecords, len(offsets))
	}

	// Test queryCompressedIndex function with a specific prefix
	provider.indexData = compressedData
	provider.indexOffsets = offsets

	for _, testPrefix := range []string{"a", "ab", "b", "xyz"} {
		record, err := provider.queryCompressedIndex(testPrefix)
		if err != nil {
			t.Errorf("Failed to query compressed index for prefix '%s': %v", testPrefix, err)
			continue
		}

		if record.Prefix == "" {
			t.Errorf("Expected a record for prefix '%s', but got empty prefix", testPrefix)
			continue
		}

		// Verify the query returns the correct record
		foundPrefix := record.Prefix
		expectedPrefix := testPrefix
		// For prefixes of length 1 or 2, the longest matching prefix should be returned
		if len(testPrefix) == 1 {
			// e.g., for "a", expect the last match which would be "abc"
			for p := range dummyIndex {
				if strings.HasPrefix(p, testPrefix) && p > expectedPrefix {
					expectedPrefix = p
				}
			}
		}

		if !strings.HasPrefix(foundPrefix, testPrefix) {
			t.Errorf("For query '%s', expected prefix starting with '%s', but got '%s'",
				testPrefix, testPrefix, foundPrefix)
		}
	}
}
