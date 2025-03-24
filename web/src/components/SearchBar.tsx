import { useState, useEffect, useRef, ChangeEvent } from "react";
import { DictionaryEntry, Flashcard, SearchHistoryItem } from "../types";
import { dictionary } from "../data/dictionaryData";

type SearchBarProps = {
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  wordData: DictionaryEntry | { word: string; error: boolean } | null;
  setWordData: React.Dispatch<
    React.SetStateAction<
      DictionaryEntry | { word: string; error: boolean } | null
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
  const [editingFlashcard, setEditingFlashcard] = useState<{
    index: number;
    isEditing: boolean;
  } | null>(null);
  const [editedFlashcard, setEditedFlashcard] = useState<{
    front: string;
    back: string;
  } | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null>(null);
  const [exportNotification, setExportNotification] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null>(null);
  const [selectedFlashcards, setSelectedFlashcards] = useState<
    { front: string; back: string }[]
  >([]);
  const [showModelRequiredMessage, setShowModelRequiredMessage] =
    useState<boolean>(false);

  const isModelConfigured = (): boolean => {
    const customModels = localStorage.getItem("customModels");
    const selectedModel = localStorage.getItem("selectedModel");

    return !!(
      customModels &&
      JSON.parse(customModels).length > 0 &&
      selectedModel
    );
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
    if (exportNotification?.visible) {
      const timer = setTimeout(() => {
        setExportNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportNotification]);

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

  const isFlashcardExported = (flashcard: {
    front: string;
    back: string;
  }): boolean => {
    return exportedFlashcards.some(
      (exported) =>
        exported.front === flashcard.front && exported.back === flashcard.back
    );
  };

  const isFlashcardSelected = (flashcard: {
    front: string;
    back: string;
  }): boolean => {
    return selectedFlashcards.some(
      (selected) =>
        selected.front === flashcard.front && selected.back === flashcard.back
    );
  };

  const toggleFlashcard = (
    flashcard: {
      front: string;
      back: string;
    },
    index: number
  ): void => {
    if (editingFlashcard && editingFlashcard.index === index) {
      return;
    }

    const isAlreadySelected = isFlashcardSelected(flashcard);

    if (isAlreadySelected) {
      setSelectedFlashcards(
        selectedFlashcards.filter(
          (selected) =>
            !(
              selected.front === flashcard.front &&
              selected.back === flashcard.back
            )
        )
      );
    } else {
      setSelectedFlashcards([
        ...selectedFlashcards,
        {
          front: flashcard.front,
          back: flashcard.back,
        },
      ]);
    }
  };

  const handleExportToAnki = (): void => {
    if (!wordData || "error" in wordData || !wordData.flashcards) return;

    const flashcardsToExport = wordData.flashcards.filter((flashcard) =>
      isFlashcardSelected(flashcard)
    );

    if (flashcardsToExport.length === 0) {
      setExportNotification({
        message: "Please select at least one flashcard to export",
        type: "error",
        visible: true,
      });
      return;
    }

    const newExportedFlashcards = [
      ...exportedFlashcards,
      ...flashcardsToExport.map((card) => ({
        ...card,
        word: wordData.word || "",
        exportedAt: new Date().toISOString(),
      })),
    ];

    setExportedFlashcards(newExportedFlashcards);

    try {
      const existingExportsString = localStorage.getItem("ankiExports") || "[]";
      const existingExports = JSON.parse(existingExportsString);

      const newExport = {
        exportId: Date.now().toString(),
        exportDate: new Date().toISOString(),
        word: wordData.word,
        flashcards: flashcardsToExport.map((card) => ({
          front: card.front,
          back: card.back,
        })),
      };

      localStorage.setItem(
        "ankiExports",
        JSON.stringify([...existingExports, newExport])
      );

      localStorage.setItem(
        "exportedFlashcards",
        JSON.stringify(newExportedFlashcards)
      );

      setExportNotification({
        message: "Flashcards successfully exported to Anki!",
        type: "success",
        visible: true,
      });

      setSelectedFlashcards([]);
    } catch (error) {
      console.error("Error saving flashcards:", error);
      setExportNotification({
        message: "Failed to export flashcards. Please try again later.",
        type: "error",
        visible: true,
      });
    }
  };

  const startEditingFlashcard = (
    index: number,
    flashcard: { front: string; back: string },
    e?: React.MouseEvent
  ): void => {
    e?.stopPropagation();

    setEditingFlashcard({ index, isEditing: true });
    setEditedFlashcard({ ...flashcard });
  };

  const saveFlashcardEdit = (index: number): void => {
    if (
      !wordData ||
      "error" in wordData ||
      !wordData.flashcards ||
      !editedFlashcard
    )
      return;

    const updatedWordData = { ...wordData };

    if (updatedWordData.flashcards && updatedWordData.flashcards[index]) {
      updatedWordData.flashcards[index] = editedFlashcard;
    }

    setWordData(updatedWordData);

    const originalFlashcard = wordData.flashcards[index];
    const isAlreadyExported = isFlashcardExported(originalFlashcard);

    if (isAlreadyExported) {
      setExportedFlashcards((prev) => {
        return prev.map((exported) =>
          exported.front === originalFlashcard.front &&
          exported.back === originalFlashcard.back
            ? {
                ...exported,
                front: editedFlashcard.front,
                back: editedFlashcard.back,
              }
            : exported
        );
      });
    } else {
      setSelectedFlashcards([
        ...selectedFlashcards,
        {
          front: editedFlashcard.front,
          back: editedFlashcard.back,
        },
      ]);
    }

    setEditingFlashcard(null);
    setEditedFlashcard(null);
  };

  const cancelFlashcardEdit = (): void => {
    setEditingFlashcard(null);
    setEditedFlashcard(null);
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
              This is required for generating definitions.
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
                  <div className="flex items-center justify-between mb-3 relative">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      Anki Flashcards
                    </h3>
                    <div className="flex flex-col items-end">
                      {exportNotification && (
                        <div
                          className={`absolute top-full right-0 z-10 mt-2 px-3 py-2 rounded-md text-sm shadow-md ${
                            exportNotification.type === "success"
                              ? "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
                              : "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
                          } flex items-center transition-opacity duration-300 ease-in-out whitespace-nowrap`}
                        >
                          {exportNotification.type === "success" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 mr-1.5"
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
                              className="h-4 w-4 mr-1.5"
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
                          <span>{exportNotification.message}</span>
                        </div>
                      )}
                      <button
                        onClick={handleExportToAnki}
                        className="flex items-center text-sm font-medium px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Export to Anki
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select cards to export for your study sessions, or edit them
                    to better fit your needs:
                  </p>

                  <div className="grid gap-3">
                    {wordData.flashcards.map((flashcard, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg overflow-hidden ${
                          isFlashcardSelected(flashcard)
                            ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {editingFlashcard &&
                        editingFlashcard.index === index ? (
                          <div className="p-4">
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Front (Question)
                              </label>
                              <input
                                type="text"
                                value={editedFlashcard?.front || ""}
                                onChange={(e) =>
                                  setEditedFlashcard((prev) =>
                                    prev
                                      ? { ...prev, front: e.target.value }
                                      : null
                                  )
                                }
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                              />
                            </div>
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Back (Answer)
                              </label>
                              <input
                                type="text"
                                value={editedFlashcard?.back || ""}
                                onChange={(e) =>
                                  setEditedFlashcard((prev) =>
                                    prev
                                      ? { ...prev, back: e.target.value }
                                      : null
                                  )
                                }
                                className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={cancelFlashcardEdit}
                                className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => saveFlashcardEdit(index)}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center p-4">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => toggleFlashcard(flashcard, index)}
                            >
                              <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                                {flashcard.front}
                              </div>
                              <div className="text-gray-600 dark:text-gray-400 text-sm">
                                {flashcard.back}
                              </div>
                            </div>
                            <div className="flex space-x-2 ml-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingFlashcard(index, flashcard, e);
                                }}
                                className="text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                                title="Edit flashcard"
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <div
                                className={`${
                                  isFlashcardSelected(flashcard)
                                    ? "text-blue-500 dark:text-blue-400"
                                    : "text-gray-400 dark:text-gray-600"
                                }`}
                                onClick={() =>
                                  toggleFlashcard(flashcard, index)
                                }
                              >
                                {isFlashcardSelected(flashcard) ? (
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
                        )}
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
