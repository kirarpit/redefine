import { useState, useEffect, useRef, ChangeEvent } from "react";
import { ExplanationEntry, Flashcard, SearchHistoryItem } from "../types";
import { dictionary } from "../data/dictionaryData";
import { useFlashcardManager, FlashcardList } from "./Flashcard";

type SearchBarProps = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  wordData: ExplanationEntry | { query: string; error: boolean } | null;
  setWordData: React.Dispatch<
    React.SetStateAction<
      ExplanationEntry | { query: string; error: boolean } | null
    >
  >;
  isStreaming: boolean;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  streamedText: string;
  setStreamedText: React.Dispatch<React.SetStateAction<string>>;
  exportedFlashcards: Flashcard[];
  setExportedFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  searchHistory: SearchHistoryItem[];
  setSearchHistory: React.Dispatch<React.SetStateAction<SearchHistoryItem[]>>;
  onNavigateToSettings?: () => void;
};

const SearchBar: React.FC<SearchBarProps> = ({
  query,
  setQuery,
  wordData,
  setWordData,
  isStreaming,
  setIsStreaming,
  streamedText,
  setStreamedText,
  exportedFlashcards,
  setExportedFlashcards,
  searchHistory,
  setSearchHistory,
  onNavigateToSettings,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null>(null);
  const [showModelRequiredMessage, setShowModelRequiredMessage] =
    useState<boolean>(false);

  // Use the flashcard manager hook
  const flashcardManager = useFlashcardManager(
    wordData,
    setWordData,
    exportedFlashcards,
    setExportedFlashcards
  );

  const isModelConfigured = (): boolean => {
    const selectedModel = localStorage.getItem("selectedModel");
    return !!selectedModel;
  };

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (notification?.visible) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (showModelRequiredMessage) {
      const timer = setTimeout(() => {
        setShowModelRequiredMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showModelRequiredMessage]);

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

    if (!isModelConfigured()) {
      setShowModelRequiredMessage(true);
      return;
    }

    setQuery(searchQuery);
    setSuggestions([]);
    setSelectedIndex(null);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsStreaming(false);
    setStreamedText("");

    const data = dictionary[searchQuery.toLowerCase()];

    if (data) {
      setWordData(data);
      streamExplanation(data.explanation);

      setSearchHistory((prev) => {
        const filteredHistory = prev.filter(
          (item) => item.query !== data.query
        );
        return [
          { query: data.query, timestamp: new Date().toISOString() },
          ...filteredHistory,
        ].slice(0, 100);
      });
    } else {
      setWordData({
        query: searchQuery,
        error: true,
      });
      setStreamedText("");
    }
  };

  const streamExplanation = (text: string): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setIsStreaming(true);
    if (text.length === 0) return;
    setStreamedText("");
    let index = 0;

    intervalRef.current = setInterval(() => {
      if (index < text.length) {
        const currentChar = text.charAt(index);
        setStreamedText((prev) => prev + currentChar);
        index++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
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
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string): void => {
    handleSearch(suggestion);
  };

  return (
    <div className="flex flex-col">
      {notification && (
        <div
          className={`mb-4 px-4 py-3 rounded-md ${
            notification.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          } flex items-center justify-between transition-opacity duration-300 ease-in-out`}
        >
          <div className="flex items-center">
            {notification.type === "success" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
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
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {showModelRequiredMessage && (
        <div className="mb-4 px-4 py-3 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 flex items-center justify-between transition-opacity duration-300 ease-in-out">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              Please configure a language model in Settings before searching.
              This is required for generating explanations.
            </span>
          </div>
          <div className="flex items-center">
            <button
              onClick={onNavigateToSettings}
              className="underline text-amber-700 dark:text-amber-300 font-medium mr-3 hover:text-amber-900 dark:hover:text-amber-100"
            >
              Go to Settings
            </button>
            <button
              onClick={() => setShowModelRequiredMessage(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-6" ref={searchBarRef}>
        <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-blue-400">
          <input
            type="text"
            placeholder="Search for anything..."
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
              We couldn't find any information about "{wordData.query}". Please
              try another query.
            </div>
          ) : (
            <>
              <div className="flex items-center mb-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {wordData.query}
                </h2>
                <span className="ml-3 text-gray-500 dark:text-gray-400 text-sm font-normal italic">
                  {wordData.pronunciation}
                </span>
                <button
                  className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Pronounce query"
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
                {wordData.type}
              </div>

              <div className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 min-h-24">
                {streamedText}
                {isStreaming && <span className="animate-pulse">|</span>}
              </div>

              {wordData.quotes && wordData.quotes.length > 0 && (
                <div className="text-gray-600 dark:text-gray-400 italic mb-6 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  {wordData.quotes.map((quote, index) => (
                    <p key={index}>{quote}</p>
                  ))}
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

              {/* Flashcard list component */}
              <FlashcardList
                wordData={wordData}
                flashcardState={flashcardManager.state}
                isFlashcardSelected={flashcardManager.isFlashcardSelected}
                handleExportToAnki={flashcardManager.handleExportToAnki}
                toggleFlashcard={flashcardManager.toggleFlashcard}
                startEditingFlashcard={flashcardManager.startEditingFlashcard}
                saveFlashcardEdit={flashcardManager.saveFlashcardEdit}
                cancelFlashcardEdit={flashcardManager.cancelFlashcardEdit}
                updateEditedFlashcard={flashcardManager.updateEditedFlashcard}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
