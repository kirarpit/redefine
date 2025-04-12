import { useState, useEffect, useRef, useCallback, memo } from "react";
import SearchBar from "./SearchBar";
import HistoryPanel from "./HistoryPanel";
import SettingsPanel from "./SettingsPanel";
import { ExplanationEntry, Flashcard, SearchHistoryItem } from "../types";
import { searchExplanation, getSelectedModelId } from "./SearchBar";
import logo from "../assets/logo.svg";

// Create a memo-wrapped component for streamed text to prevent re-renders
const StreamedText = memo(function StreamedText({
  explanation,
  onStreamComplete,
}: {
  explanation: string;
  onStreamComplete: () => void;
}) {
  const [streamedText, setStreamedText] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const streamIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Start streaming when explanation changes
    if (explanation.length === 0) return;

    setIsStreaming(true);
    setStreamedText("");
    let index = 0;

    streamIntervalRef.current = window.setInterval(() => {
      if (index < explanation.length) {
        const currentChar = explanation.charAt(index);
        setStreamedText((prev) => prev + currentChar);
        index++;
      } else {
        if (streamIntervalRef.current !== null) {
          clearInterval(streamIntervalRef.current);
          streamIntervalRef.current = null;
        }
        setIsStreaming(false);
        onStreamComplete();
      }
    }, 10);

    // Clean up interval on unmount or when explanation changes
    return () => {
      if (streamIntervalRef.current !== null) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
    };
  }, [explanation, onStreamComplete]);

  return (
    <>
      {streamedText}
      {isStreaming && <span className="animate-pulse">|</span>}
    </>
  );
});

type TabType = "search" | "history" | "settings";

const DarkModeIcon: React.FC<{ darkMode: boolean }> = ({ darkMode }) => {
  return darkMode ? (
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
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
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
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
};

interface NavTabProps {
  id: TabType;
  label: string;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}

const NavTab: React.FC<NavTabProps> = ({ id, label, activeTab, onClick }) => {
  return (
    <button
      onClick={() => onClick(id)}
      className={`py-2 px-4 text-sm font-medium transition-colors ${
        activeTab === id
          ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
      aria-label={label}
    >
      {label}
    </button>
  );
};

const Redefine: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    console.log("Initializing darkMode state");
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      const parsedMode = JSON.parse(savedMode);
      console.log("Using saved dark mode for initial state:", parsedMode);
      return parsedMode;
    }

    // Check system preference if no saved preference exists
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    console.log(
      "No saved preference found, using system preference:",
      prefersDarkMode
    );
    return prefersDarkMode;
  });

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const savedTab = localStorage.getItem("activeTab");
    return savedTab ? (JSON.parse(savedTab) as TabType) : "search";
  });

  // Lifted search state from SearchBar
  const [query, setQuery] = useState<string>("");
  const [wordData, setWordData] = useState<
    ExplanationEntry | { query: string; error: boolean } | null
  >(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // We no longer need to track streamedText at this level
  // const [streamedText, setStreamedText] = useState<string>("");

  const [exportedFlashcards, setExportedFlashcards] = useState<Flashcard[]>(
    () => {
      const exported = localStorage.getItem("exportedFlashcards");
      return exported ? JSON.parse(exported) : [];
    }
  );
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const history = localStorage.getItem("searchHistory");
      return history ? JSON.parse(history) : [];
    }
  );
  // New state for notifications and loading
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModelRequiredMessage, setShowModelRequiredMessage] =
    useState<boolean>(false);

  // Store the explanation text directly for the StreamedText component
  const [explanationText, setExplanationText] = useState<string>("");

  useEffect(() => {
    console.log("Dark mode useEffect triggered. Current value:", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(
      "exportedFlashcards",
      JSON.stringify(exportedFlashcards)
    );
  }, [exportedFlashcards]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  }, [searchHistory]);

  useEffect(() => {
    localStorage.setItem("activeTab", JSON.stringify(activeTab));
  }, [activeTab]);

  const toggleDarkMode = (): void => {
    setDarkMode((prev) => !prev);
  };

  // Callback function for when streaming is complete
  const handleStreamComplete = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleSearch = async (searchQuery: string): Promise<void> => {
    if (!searchQuery) return;

    const isModelConfigured = (): boolean => {
      const selectedModel = localStorage.getItem("selectedModel");
      return !!selectedModel;
    };

    if (!isModelConfigured()) {
      setShowModelRequiredMessage(true);
      return;
    }

    setQuery(searchQuery);
    setIsStreaming(true);
    // We don't need to set streamedText anymore
    // setStreamedText("");
    setExplanationText(""); // Reset explanation text instead

    // Set loading states
    setIsLoading(true);
    setWordData(null);

    try {
      const modelId = getSelectedModelId();
      if (!modelId) {
        setShowModelRequiredMessage(true);
        setIsLoading(false);
        return;
      }

      const data = await searchExplanation(searchQuery, modelId);

      setWordData(data);
      // Instead of streaming explanation, we just store the text
      // streamExplanation(data.explanation);
      setExplanationText(data.explanation);

      console.log("searchQuery", searchQuery);
      setSearchHistory((prev) => {
        const filteredHistory = prev.filter(
          (item) => item.query !== searchQuery
        );
        return [
          { query: searchQuery, timestamp: new Date().toISOString() },
          ...filteredHistory,
        ].slice(0, 100);
      });
    } catch (error) {
      console.error("Error searching:", error);
      setWordData({
        query: searchQuery,
        error: true,
      });
      // setStreamedText("");
      setExplanationText("");
      setNotification({
        message: "Failed to retrieve explanation. Please try again later.",
        type: "error",
        visible: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNavigateToSearch = (word: string): void => {
    setActiveTab("search");
    handleSearch(word);
  };

  const handleNavigateToSettings = () => {
    setActiveTab("settings");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="w-full max-w-4xl mx-auto flex-1 p-4 md:py-12 md:px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 content-container">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <img
                src={logo}
                alt="Redefine logo"
                className={`h-8 md:h-10 mr-3 ${
                  darkMode ? "logo-dark-mode" : ""
                }`}
              />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Redefine
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  AI-powered word learning reimagined.
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              <DarkModeIcon darkMode={darkMode} />
            </button>
          </div>

          <div className="mb-6">
            <nav className="flex border-b border-gray-200 dark:border-gray-700">
              <NavTab
                id="search"
                label="Search"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
              <NavTab
                id="history"
                label="History & Flashcards"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
              <NavTab
                id="settings"
                label="Settings"
                activeTab={activeTab}
                onClick={setActiveTab}
              />
            </nav>
          </div>

          <div style={{ display: activeTab === "search" ? "block" : "none" }}>
            <SearchBar
              query={query}
              setQuery={setQuery}
              wordData={wordData}
              setWordData={setWordData}
              isStreaming={isStreaming}
              setIsStreaming={setIsStreaming}
              // We no longer pass streamedText, but instead pass the StreamedText component
              streamedTextComponent={
                wordData && !("error" in wordData) ? (
                  <StreamedText
                    explanation={explanationText}
                    onStreamComplete={handleStreamComplete}
                  />
                ) : null
              }
              exportedFlashcards={exportedFlashcards}
              setExportedFlashcards={setExportedFlashcards}
              onNavigateToSettings={handleNavigateToSettings}
              handleSearch={handleSearch}
              isLoading={isLoading}
              notification={notification}
              setNotification={setNotification}
              showModelRequiredMessage={showModelRequiredMessage}
              setShowModelRequiredMessage={setShowModelRequiredMessage}
              activeTab={activeTab}
            />
          </div>
          <div style={{ display: activeTab === "history" ? "block" : "none" }}>
            <HistoryPanel
              searchHistory={searchHistory}
              setSearchHistory={setSearchHistory}
              exportedFlashcards={exportedFlashcards}
              setExportedFlashcards={setExportedFlashcards}
              onNavigateToSearch={handleNavigateToSearch}
            />
          </div>
          <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
            <SettingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Redefine;
