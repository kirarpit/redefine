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

func createTestWordFile(t *testing.T) string {

	testDir := filepath.Join(os.TempDir(), "redefine-test")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		t.Fatalf("Failed to create test directory: %v", err)
	}

	testFile := filepath.Join(testDir, "test_words.txt")
	f, err := os.Create(testFile)
	if err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}
	defer f.Close()

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
		"supercalifragilisticexpialidocious",
	}

	for _, word := range testWords {
		f.WriteString(word + "\n")
	}

	return testFile
}

func TestMmapProviderLoadAndFindSuggestions(t *testing.T) {

	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	provider := NewMmapProvider()

	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

	if !provider.initialized {
		t.Fatal("Provider was not initialized")
	}

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

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			results := provider.FindSuggestions(tc.query, tc.limit)
			t.Logf("Query '%s', got results: %v", tc.query, results)

			if len(results) > tc.limit {
				t.Errorf("Got too many results, expected max %d but got %d", tc.limit, len(results))
			}

			sort.Strings(results)
			sort.Strings(tc.expected)

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

	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	provider := NewMmapProvider()

	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

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

	provider.cleanup()

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
			input:    "abcdefghijklmnopqrstuvwx",
			expected: "abcdefghijklmnopqrstuvwx",
		},
		{
			name:     "Word longer than WordLen",
			input:    "abcdefghijklmnopqrstuvwxyz",
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

	if len(compressed) == 0 {
		t.Fatal("Compression produced empty result")
	}

	offsets, err := provider.buildOffsetTable(compressed)
	if err != nil {
		t.Fatalf("Failed to build offset table: %v", err)
	}

	provider.indexData = compressed
	provider.indexOffsets = offsets

	tests := []struct {
		prefix          string
		expectedMatches bool
	}{
		{"a", true},
		{"ap", true},
		{"app", true},
		{"b", true},
		{"m", true},
		{"z", false},
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

				if !strings.HasPrefix(record.Prefix, tc.prefix) {
					t.Errorf("For prefix '%s' got record with prefix '%s', which doesn't match",
						tc.prefix, record.Prefix)
				}
			} else {

				if record.Prefix != "" {
					t.Errorf("For prefix '%s' expected empty prefix, but got: %+v", tc.prefix, record)
				}
			}
		})
	}
}

func BenchmarkMmapSearch(b *testing.B) {

	testDir := filepath.Join(os.TempDir(), "redefine-bench")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		b.Fatalf("Failed to create test directory: %v", err)
	}
	defer os.RemoveAll(testDir)

	testFile := filepath.Join(testDir, "bench_words.txt")
	f, err := os.Create(testFile)
	if err != nil {
		b.Fatalf("Failed to create test file: %v", err)
	}

	const alphabet = "abcdefghijklmnopqrstuvwxyz"
	for i := 0; i < len(alphabet); i++ {
		f.WriteString(string(alphabet[i]) + "\n")
		for j := 0; j < len(alphabet); j++ {
			f.WriteString(string(alphabet[i]) + string(alphabet[j]) + "\n")
		}
	}
	f.Close()

	provider := NewMmapProvider()

	if err := provider.LoadData(testFile); err != nil {
		b.Fatalf("Failed to load test data: %v", err)
	}

	var m1, m2 runtime.MemStats
	runtime.ReadMemStats(&m1)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {

		prefix := string(alphabet[i%len(alphabet)])
		provider.FindSuggestions(prefix, 10)
	}

	runtime.ReadMemStats(&m2)

	b.ReportMetric(float64(m2.TotalAlloc-m1.TotalAlloc)/1024/1024, "MB_total")
	b.ReportMetric(float64(m2.HeapAlloc-m1.HeapAlloc)/1024/1024, "MB_heap")
}

func TestMemoryUsage(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping memory test in short mode")
	}

	testFile := createTestWordFile(t)
	defer os.RemoveAll(filepath.Dir(testFile))

	provider := NewMmapProvider()

	if err := provider.LoadData(testFile); err != nil {
		t.Fatalf("Failed to load test data: %v", err)
	}

	var m runtime.MemStats
	runtime.GC()
	runtime.ReadMemStats(&m)

	t.Logf("Memory usage after loading: %v KB", m.HeapAlloc/1024)
	t.Logf("Total allocated memory: %v KB", m.TotalAlloc/1024)

	for i := 0; i < 100; i++ {
		provider.FindSuggestions("a", 10)
		provider.FindSuggestions("b", 10)
		provider.FindSuggestions("m", 10)
	}

	runtime.GC()
	runtime.ReadMemStats(&m)

	t.Logf("Memory usage after searching: %v KB", m.HeapAlloc/1024)
	t.Logf("Total allocated memory: %v KB", m.TotalAlloc/1024)
}

func TestCompressIndexAndReadRecord(t *testing.T) {

	dummyIndex := map[string][2]int64{
		"a":    {0, 100},
		"ab":   {0, 50},
		"abc":  {0, 30},
		"b":    {100, 200},
		"bc":   {120, 180},
		"xyz":  {500, 600},
		"long": {1000, 2000},
	}

	provider := NewMmapProvider()
	compressedData := provider.compressIndex(dummyIndex)

	if len(compressedData) == 0 {
		t.Fatal("Compression produced empty result")
	}

	numRecords := int(binary.LittleEndian.Uint64(compressedData[:8]))
	if numRecords != len(dummyIndex) {
		t.Errorf("Expected %d records, but header indicates %d records", len(dummyIndex), numRecords)
	}

	recordsRead := make(map[string]IndexRecord)
	offset := 8

	for i := 0; i < numRecords; i++ {
		record, next, err := provider.readRecord(compressedData, offset)
		if err != nil {
			t.Fatalf("Failed to read record at offset %d: %v", offset, err)
		}

		recordsRead[record.Prefix] = record

		offset = next
	}

	if len(recordsRead) != len(dummyIndex) {
		t.Errorf("Expected to read %d records, but got %d", len(dummyIndex), len(recordsRead))
	}

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

	for offset, prefix := range map[int]string{
		8: "a",
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

	offsets, err := provider.buildOffsetTable(compressedData)
	if err != nil {
		t.Fatalf("Failed to build offset table: %v", err)
	}

	if len(offsets) != numRecords {
		t.Errorf("Expected %d offsets in offset table, but got %d", numRecords, len(offsets))
	}

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

		foundPrefix := record.Prefix
		expectedPrefix := testPrefix

		if len(testPrefix) == 1 {

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
