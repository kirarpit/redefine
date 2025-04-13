import { useState, useEffect, useRef, ChangeEvent } from "react";
import { ExplanationEntry, Flashcard } from "../types";
import { useFlashcardManager, FlashcardList } from "./Flashcard";
import { API_BASE_URL } from "../config";

// Simple LocationMap component
const LocationMap: React.FC<{ location: string }> = ({ location }) => {
  // Embed Google Maps with the location query
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    location
  )}&output=embed`;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Location Map
        </h3>
      </div>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <iframe
          src={mapUrl}
          className="w-full h-64"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${location}`}
        ></iframe>
      </div>
    </div>
  );
};

export const searchExplanation = async (
  query: string,
  modelId: string,
  promptType: string = "general"
): Promise<ExplanationEntry> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/explain/search?q=${encodeURIComponent(
        query
      )}&modelId=${encodeURIComponent(modelId)}&promptType=${encodeURIComponent(
        promptType
      )}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log(data);
    return data.entry;
  } catch (error) {
    console.error("Error searching for explanation:", error);
    throw error;
  }
};

// Add a new function to fetch autocomplete suggestions from the backend
export const fetchSuggestions = async (query: string): Promise<string[]> => {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/explain/autosuggest?q=${encodeURIComponent(
        query.trim()
      )}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};

export const getSelectedModelId = (): string | null => {
  return localStorage.getItem("selectedModel");
};

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
  streamedTextComponent: React.ReactNode;
  exportedFlashcards: Flashcard[];
  setExportedFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  onNavigateToSettings?: () => void;
  handleSearch: (searchQuery: string) => Promise<void>;
  isLoading: boolean;
  isLoadingFlashcards?: boolean;
  notification: {
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null;
  setNotification: React.Dispatch<
    React.SetStateAction<{
      message: string;
      type: "success" | "error";
      visible: boolean;
    } | null>
  >;
  showModelRequiredMessage: boolean;
  setShowModelRequiredMessage: React.Dispatch<React.SetStateAction<boolean>>;
  activeTab?: string;
};

const SearchBar: React.FC<SearchBarProps> = ({
  query,
  setQuery,
  wordData,
  setWordData,
  isStreaming,
  setIsStreaming,
  streamedTextComponent,
  exportedFlashcards,
  setExportedFlashcards,
  onNavigateToSettings,
  handleSearch,
  isLoading,
  isLoadingFlashcards = false,
  notification,
  setNotification,
  showModelRequiredMessage,
  setShowModelRequiredMessage,
  activeTab,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMouseActive, setIsMouseActive] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [preventSuggestions, setPreventSuggestions] = useState<boolean>(false);

  // Use the flashcard manager hook
  const flashcardManager = useFlashcardManager(
    wordData,
    setWordData,
    exportedFlashcards,
    setExportedFlashcards
  );

  // Focus the search input when component mounts or when tab changes to search
  useEffect(() => {
    // Only focus if the activeTab is "search" or undefined (for first load)
    if (inputRef.current && (!activeTab || activeTab === "search")) {
      inputRef.current.focus();
    }
  }, [activeTab]);

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

  // Debounced autocomplete
  useEffect(() => {
    const fetchSuggestionsDebounced = async () => {
      if (!query.trim() || preventSuggestions) {
        setSuggestions([]);
        return;
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        const results = await fetchSuggestions(query);
        setSuggestions(results);
      } catch (error) {
        // Only log if it's not an abort error
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching suggestions:", error);
        }
        setSuggestions([]);
      }
    };

    // Debounce the suggestions request
    const timeoutId = setTimeout(() => {
      fetchSuggestionsDebounced();
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, preventSuggestions]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(null);
    setIsMouseActive(false);
    // Enable suggestions when the user starts typing again
    setPreventSuggestions(false);
  };

  const handleMouseMove = (): void => {
    setIsMouseActive(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      if (
        selectedIndex !== null &&
        suggestions &&
        suggestions.length > 0 &&
        suggestions[selectedIndex]
      ) {
        handleSearch(suggestions[selectedIndex].trim());
        setSuggestions([]);
        setPreventSuggestions(true);
      } else {
        handleSearch(query.trim());
        setSuggestions([]);
        setPreventSuggestions(true);
      }
    } else if (e.key === "ArrowDown") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === (suggestions?.length ?? 0) - 1
          ? 0
          : prevIndex + 1
      );
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prevIndex) =>
        prevIndex === null || prevIndex === 0
          ? (suggestions?.length ?? 0) - 1
          : prevIndex - 1
      );
    } else if (e.key === "Escape") {
      if (suggestions && suggestions.length > 0) {
        setSuggestions([]);
      } else {
        (e.target as HTMLInputElement).blur();
      }
    }
  };

  const handleSuggestionClick = (suggestion: string): void => {
    handleSearch(suggestion.trim());
    setSuggestions([]);
    setPreventSuggestions(true);
  };

  // Disable suggestions when search button is clicked directly
  const handleSearchButtonClick = (): void => {
    handleSearch(query.trim());
    setSuggestions([]);
    setPreventSuggestions(true);
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
            ref={inputRef}
            type="text"
            placeholder="Search for anything..."
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="w-full bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none"
            autoComplete="off"
            disabled={isLoading}
          />
          <button
            onClick={handleSearchButtonClick}
            className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 px-4 transition duration-150 flex items-center justify-center"
            aria-label="Search"
            type="button"
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
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
            )}
          </button>
        </div>

        {suggestions && suggestions.length > 0 ? (
          <ul
            className="absolute z-50 w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto"
            onMouseMove={handleMouseMove}
            style={{ position: "absolute", top: "100%", left: 0, right: 0 }}
          >
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`px-4 py-2 cursor-pointer ${
                  selectedIndex === index ? "bg-gray-100 dark:bg-gray-700" : ""
                } ${
                  isMouseActive
                    ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                    : ""
                } text-gray-700 dark:text-gray-200`}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        ) : null}
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

              <div className="text-gray-700 dark:text-gray-300 leading-relaxed mb-6 min-h-18">
                {streamedTextComponent}
              </div>

              {wordData.quotes && wordData.quotes.length > 0 ? (
                <div className="text-gray-600 dark:text-gray-400 italic mb-6 pl-4 border-l-2 border-gray-200 dark:border-gray-600">
                  {wordData.quotes.map((quote, index) => (
                    <p key={index}>{quote}</p>
                  ))}
                </div>
              ) : null}

              {wordData.type &&
              wordData.type
                .toLowerCase()
                .match(
                  /(location|region|place|area|city|country|state|province)/
                ) ? (
                <LocationMap location={wordData.query} />
              ) : null}

              {wordData &&
              "related_items" in wordData &&
              wordData.related_items &&
              wordData.related_items.length > 0 ? (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Related Items:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wordData.related_items.map((item, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm px-3 py-1 rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => handleSearch(item.trim())}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Flashcard list component */}
              <FlashcardList
                wordData={wordData}
                flashcardState={flashcardManager.state}
                ankiState={flashcardManager.ankiState}
                isFlashcardSelected={flashcardManager.isFlashcardSelected}
                handleExportToAnki={flashcardManager.handleExportToAnki}
                toggleFlashcard={flashcardManager.toggleFlashcard}
                startEditingFlashcard={flashcardManager.startEditingFlashcard}
                saveFlashcardEdit={flashcardManager.saveFlashcardEdit}
                cancelFlashcardEdit={flashcardManager.cancelFlashcardEdit}
                updateEditedFlashcard={flashcardManager.updateEditedFlashcard}
                toggleDebugInfo={flashcardManager.toggleDebugInfo}
                clearLogs={flashcardManager.clearLogs}
                refreshConnection={flashcardManager.refreshAnkiConnection}
                isLoadingFlashcards={isLoadingFlashcards}
              />
            </>
          )}
        </div>
      )}

      {!wordData && isLoading && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-blue-200 dark:border-blue-900/30"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 border-b-blue-500"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/50 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
