import { useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react";
import { DictionaryEntry, Flashcard, SearchHistoryItem } from "../types";
import { dictionary } from "../data/dictionaryData";

type SearchBarProps = {
  // Add any props if needed
};

const SearchBar: React.FC<SearchBarProps> = () => {
  const [query, setQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wordData, setWordData] = useState<
    DictionaryEntry | { word: string; error: boolean } | null
  >(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>("");
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const history = localStorage.getItem("searchHistory");
      return history ? JSON.parse(history) : [];
    }
  );

  // TODO: save flashcards and history to a database asynchronously after storing in local storage
  useEffect(() => {
    localStorage.setItem("savedFlashcards", JSON.stringify(savedFlashcards));
  }, [savedFlashcards]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Handle clicks outside the search bar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target as Node)
      ) {
        setSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setQuery(value);

    const filteredSuggestions = value
      ? Object.keys(dictionary).filter((word) =>
          word.toLowerCase().includes(value.toLowerCase())
        )
      : [];

    setSuggestions(filteredSuggestions);
    setSelectedIndex(null);
  };

  const handleSearch = (searchQuery: string): void => {
    if (!searchQuery) return;

    setQuery(searchQuery);
    setSuggestions([]);
    setSelectedIndex(null);

    const data = dictionary[searchQuery.toLowerCase()];

    if (data) {
      setWordData(data);
      streamDefinition(data.definition);

      setSearchHistory((prev) => {
        const filteredHistory = prev.filter((item) => item.word !== data.word);
        return [
          { word: data.word, timestamp: new Date().toISOString() },
          ...filteredHistory,
        ].slice(0, 100);
      });
    } else {
      setWordData({
        word: searchQuery,
        error: true,
      });
      setStreamedText("");
    }
  };

  const streamDefinition = (text: string): void => {
    setIsStreaming(true);
    if (text.length === 0) return;
    setStreamedText("");
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        const currentChar = text.charAt(index);
        setStreamedText((prev) => prev + currentChar);
        index++;
      } else {
        clearInterval(interval);
        setIsStreaming(false);
      }
    }, 10);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      if (selectedIndex !== null && suggestions[selectedIndex]) {
        handleSearch(suggestions[selectedIndex]);
      } else {
        handleSearch(query);
      }
    } else if (e.key === "ArrowDown") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === suggestions.length - 1
          ? 0
          : prevIndex + 1
      );
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === 0
          ? suggestions.length - 1
          : prevIndex - 1
      );
    } else if (e.key === "Escape") {
      if (suggestions.length > 0) {
        setSuggestions([]);
      } else {
        // If no suggestions are visible, defocus the input
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string): void => {
    handleSearch(suggestion);
  };

  const toggleFlashcard = (flashcard: {
    front: string;
    back: string;
  }): void => {
    const isAlreadySaved = savedFlashcards.some(
      (saved) =>
        saved.front === flashcard.front && saved.back === flashcard.back
    );

    if (isAlreadySaved) {
      setSavedFlashcards(
        savedFlashcards.filter(
          (saved) =>
            !(saved.front === flashcard.front && saved.back === flashcard.back)
        )
      );
    } else {
      setSavedFlashcards([
        ...savedFlashcards,
        {
          ...flashcard,
          word: wordData?.word || "",
          savedAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const isFlashcardSaved = (flashcard: {
    front: string;
    back: string;
  }): boolean => {
    return savedFlashcards.some(
      (saved) =>
        saved.front === flashcard.front && saved.back === flashcard.back
    );
  };

  return (
    <div className="flex flex-col">
      <div className="relative mb-6" ref={searchBarRef}>
        <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
          <input
            type="text"
            placeholder="Search for a word..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="w-full bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none"
            autoComplete="off"
          />
          <button
            onClick={() => handleSearch(query)}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 px-4 transition duration-150 flex items-center justify-center"
            aria-label="Search"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
                  selectedIndex === index ? "bg-gray-100 dark:bg-gray-700" : ""
                } text-gray-700 dark:text-gray-200`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      {wordData && (
        <div
          className={`border-t border-gray-200 dark:border-gray-700 pt-6 transition-opacity duration-300 ${
            wordData ? "opacity-100" : "opacity-0"
          }`}
        >
          {"error" in wordData ? (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
              We couldn't find "{wordData.word}" in our dictionary. Please try
              another word.
            </div>
          ) : (
            <>
              <div className="flex items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {wordData.word}
                </h2>
                <span className="ml-3 text-gray-500 dark:text-gray-400 text-sm font-normal italic">
                  {wordData.phonetic}
                </span>
                <button
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Pronounce word"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                </button>
              </div>

              <div className="text-sm text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wide mb-3">
                {wordData.partOfSpeech}
              </div>

              <div className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 min-h-24">
                {streamedText}
                {isStreaming && <span className="animate-pulse">|</span>}
              </div>

              {wordData.example && (
                <div className="text-gray-600 dark:text-gray-400 italic mb-6 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  {wordData.example}
                </div>
              )}

              {wordData.synonyms && wordData.synonyms.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Synonyms:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wordData.synonyms.map((synonym, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSearch(synonym)}
                      >
                        {synonym}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {wordData.flashcards && wordData.flashcards.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                    Anki Flashcards
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select cards to save for your study sessions:
                  </p>

                  <div className="grid gap-3">
                    {wordData.flashcards.map((flashcard, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isFlashcardSaved(flashcard)
                            ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => toggleFlashcard(flashcard)}
                      >
                        <div className="flex items-center p-4">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                              {flashcard.front}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 text-sm">
                              {flashcard.back}
                            </div>
                          </div>
                          <div
                            className={`ml-3 ${
                              isFlashcardSaved(flashcard)
                                ? "text-blue-500 dark:text-blue-400"
                                : "text-gray-400 dark:text-gray-600"
                            }`}
                          >
                            {isFlashcardSaved(flashcard) ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
