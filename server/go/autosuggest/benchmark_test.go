package autosuggest

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"
	"time"
)

// Benchmark tests for comparing different autosuggest provider implementations
// To run: go test -bench=. -benchmem -benchtime=10s

// printMemStats prints memory usage statistics
func printMemStats(name string) {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	fmt.Printf("--- Memory usage for %s ---\n", name)
	fmt.Printf("Alloc = %v MiB", mem.Alloc/1024/1024)
	fmt.Printf("\tTotalAlloc = %v MiB", mem.TotalAlloc/1024/1024)
	fmt.Printf("\tSys = %v MiB", mem.Sys/1024/1024)
	fmt.Printf("\tNumGC = %v\n", mem.NumGC)
}

// Interface for test and benchmark objects that can fail
type testFailer interface {
	Fatalf(format string, args ...interface{})
}

// createBenchmarkWordFile creates a file with more words for benchmarking
func createBenchmarkWordFile(tb testFailer) string {
	// Create a temp directory
	testDir := filepath.Join(os.TempDir(), "redefine-benchmark")
	if err := os.MkdirAll(testDir, 0755); err != nil {
		tb.Fatalf("Failed to create test directory: %v", err)
	}

	// Create a test file with more words
	testFile := filepath.Join(testDir, "benchmark_words.txt")
	f, err := os.Create(testFile)
	if err != nil {
		tb.Fatalf("Failed to create benchmark file: %v", err)
	}
	defer f.Close()

	// Generate a large number of words
	// In a real benchmark, you might want to use a real dictionary
	wordCount := 100000 // 100k words for benchmark
	for i := 0; i < wordCount; i++ {
		// Generate some pseudo-random words
		word := fmt.Sprintf("word%d", i)

		// Add some with common prefixes
		if i%10 == 0 {
			word = "common" + word
		} else if i%5 == 0 {
			word = "test" + word
		} else if i%3 == 0 {
			word = "bench" + word
		}

		// Add some longer words
		if i%20 == 0 {
			word = "supercalifragilisticexpialidocious" + word
		}

		f.WriteString(word + "\n")
	}

	return testFile
}

// BenchmarkProviderInit benchmarks the initialization time and memory usage
// for different provider implementations
func BenchmarkProviderInit(b *testing.B) {
	// Create a benchmark file
	benchFile := createBenchmarkWordFile(b)
	defer os.RemoveAll(filepath.Dir(benchFile))

	// First run GC to start with a clean state
	runtime.GC()

	// Benchmark RadixProvider
	b.Run("RadixProvider", func(b *testing.B) {
		b.ResetTimer()
		printMemStats("Before RadixProvider")
		for i := 0; i < b.N; i++ {
			provider := NewRadixProvider()
			if err := provider.LoadData(benchFile); err != nil {
				b.Fatalf("Failed to load benchmark data: %v", err)
			}

			// Run a query to ensure everything is loaded
			provider.FindSuggestions("common", 10)
		}
		printMemStats("After RadixProvider")
	})

	// First run GC to start with a clean state
	runtime.GC()

	// Benchmark SimpleProvider
	b.Run("SimpleProvider", func(b *testing.B) {
		b.ResetTimer()
		printMemStats("Before SimpleProvider")
		for i := 0; i < b.N; i++ {
			provider := NewSimpleProvider(0) // No limit
			if err := provider.LoadData(benchFile); err != nil {
				b.Fatalf("Failed to load benchmark data: %v", err)
			}

			// Run a query to ensure everything is loaded
			provider.FindSuggestions("common", 10)
		}
		printMemStats("After SimpleProvider")
	})

	// First run GC to start with a clean state
	runtime.GC()

	// Benchmark MmapProvider
	b.Run("MmapProvider", func(b *testing.B) {
		b.ResetTimer()
		printMemStats("Before MmapProvider")
		for i := 0; i < b.N; i++ {
			provider := NewMmapProvider()
			if err := provider.LoadData(benchFile); err != nil {
				b.Fatalf("Failed to load benchmark data: %v", err)
			}

			// Run a query to ensure everything is loaded
			provider.FindSuggestions("common", 10)

			// Clean up resources
			provider.cleanup()
		}
		printMemStats("After MmapProvider")
	})
}

// BenchmarkProviderQuery benchmarks the query performance
// for different provider implementations
func BenchmarkProviderQuery(b *testing.B) {
	// Create a benchmark file
	benchFile := createBenchmarkWordFile(b)
	defer os.RemoveAll(filepath.Dir(benchFile))

	// Test queries
	queries := []string{
		"co",    // Common prefix (many matches)
		"test",  // Medium number of matches
		"bench", // Few matches
		"super", // Long word match
		"xyz",   // No matches
	}

	// Initialize providers once before benchmarks
	radixProvider := NewRadixProvider()
	if err := radixProvider.LoadData(benchFile); err != nil {
		b.Fatalf("Failed to load benchmark data for RadixProvider: %v", err)
	}

	simpleProvider := NewSimpleProvider(0)
	if err := simpleProvider.LoadData(benchFile); err != nil {
		b.Fatalf("Failed to load benchmark data for SimpleProvider: %v", err)
	}

	mmapProvider := NewMmapProvider()
	if err := mmapProvider.LoadData(benchFile); err != nil {
		b.Fatalf("Failed to load benchmark data for MmapProvider: %v", err)
	}

	// Benchmark query performance for each provider and query
	for _, query := range queries {
		b.Run(fmt.Sprintf("RadixQuery_%s", query), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				radixProvider.FindSuggestions(query, 10)
			}
		})

		b.Run(fmt.Sprintf("SimpleQuery_%s", query), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				simpleProvider.FindSuggestions(query, 10)
			}
		})

		b.Run(fmt.Sprintf("MmapQuery_%s", query), func(b *testing.B) {
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				mmapProvider.FindSuggestions(query, 10)
			}
		})
	}

	// Clean up the mmap provider
	mmapProvider.cleanup()
}

// TestMemoryUsage is a test that compares memory usage of different providers
func TestMemoryUsage(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping memory usage test in short mode")
	}

	// Create a benchmark file
	benchFile := createBenchmarkWordFile(t)
	defer os.RemoveAll(filepath.Dir(benchFile))

	// Memory usage before any providers
	printMemStats("Baseline")

	// Test RadixProvider
	func() {
		provider := NewRadixProvider()
		if err := provider.LoadData(benchFile); err != nil {
			t.Fatalf("Failed to load benchmark data: %v", err)
		}

		// Force garbage collection
		runtime.GC()

		// Print memory usage
		printMemStats("RadixProvider")

		// Run some queries to ensure everything is loaded
		provider.FindSuggestions("common", 10)
		provider.FindSuggestions("test", 10)
		provider.FindSuggestions("bench", 10)
	}()

	// Force garbage collection between tests
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	// Test SimpleProvider
	func() {
		provider := NewSimpleProvider(0)
		if err := provider.LoadData(benchFile); err != nil {
			t.Fatalf("Failed to load benchmark data: %v", err)
		}

		// Force garbage collection
		runtime.GC()

		// Print memory usage
		printMemStats("SimpleProvider")

		// Run some queries to ensure everything is loaded
		provider.FindSuggestions("common", 10)
		provider.FindSuggestions("test", 10)
		provider.FindSuggestions("bench", 10)
	}()

	// Force garbage collection between tests
	runtime.GC()
	time.Sleep(100 * time.Millisecond)

	// Test MmapProvider
	func() {
		provider := NewMmapProvider()
		if err := provider.LoadData(benchFile); err != nil {
			t.Fatalf("Failed to load benchmark data: %v", err)
		}

		// Force garbage collection
		runtime.GC()

		// Print memory usage
		printMemStats("MmapProvider")

		// Run some queries to ensure everything is loaded
		provider.FindSuggestions("common", 10)
		provider.FindSuggestions("test", 10)
		provider.FindSuggestions("bench", 10)

		// Clean up resources
		provider.cleanup()
	}()

	// Final memory state
	runtime.GC()
	printMemStats("Final")
}
