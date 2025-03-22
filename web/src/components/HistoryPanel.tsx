import { useState } from "react";
import { Flashcard, SearchHistoryItem } from "../types";

type HistoryPanelProps = {
  // Add any props if needed
};

const HistoryPanel: React.FC<HistoryPanelProps> = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>(
    () => {
      const history = localStorage.getItem("searchHistory");
      return history ? JSON.parse(history) : [];
    }
  );

  const [savedFlashcards, setSavedFlashcards] = useState<Flashcard[]>(() => {
    const saved = localStorage.getItem("savedFlashcards");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<"history" | "flashcards">(
    "history"
  );
  const [selectedFlashcards, setSelectedFlashcards] = useState<number[]>([]);

  const clearHistory = (): void => {
    const userConfirmed = window.confirm(
      "Are you sure you want to clear your search history?"
    );
    if (userConfirmed) {
      setSearchHistory([]);
      localStorage.setItem("searchHistory", JSON.stringify([]));
    }
  };

  const removeFlashcard = (index: number): void => {
    const newFlashcards = [...savedFlashcards];
    newFlashcards.splice(index, 1);
    setSavedFlashcards(newFlashcards);
    localStorage.setItem("savedFlashcards", JSON.stringify(newFlashcards));
  };

  const toggleSelectFlashcard = (index: number): void => {
    if (selectedFlashcards.includes(index)) {
      setSelectedFlashcards(selectedFlashcards.filter((i) => i !== index));
    } else {
      setSelectedFlashcards([...selectedFlashcards, index]);
    }
  };

  const exportSelectedFlashcards = (): void => {
    if (selectedFlashcards.length === 0) {
      alert("Please select at least one flashcard to export");
      return;
    }

    const flashcardsToExport = selectedFlashcards.map(
      (index) => savedFlashcards[index]
    );

    const ankiFormat = flashcardsToExport
      .map((card) => `${card.front}\t${card.back}`)
      .join("\n");

    const element = document.createElement("a");
    const file = new Blob([ankiFormat], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "redefine_flashcards.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setSelectedFlashcards([]);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setActiveTab("history")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Search History
        </button>
        <button
          onClick={() => setActiveTab("flashcards")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "flashcards"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Saved Flashcards
        </button>
      </div>

      {activeTab === "history" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Your Search History
            </h3>
            {searchHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {searchHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>Your search history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {searchHistory.map((item, index) => (
                <div key={index} className="py-3 flex items-center">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {item.word}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>
                  <button
                    className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    onClick={() => {
                      // Navigate to search tab and search for this word
                      const button = document.querySelector(
                        'button[onClick="() => setActiveTab(\\"search\\")"]'
                      ) as HTMLButtonElement | null;
                      if (button) button.click();

                      setTimeout(() => {
                        const searchBar = document.querySelector(
                          'input[placeholder="Search for a word..."]'
                        ) as HTMLInputElement | null;
                        if (searchBar) {
                          searchBar.value = item.word;
                          searchBar.dispatchEvent(
                            new Event("change", { bubbles: true })
                          );
                          const searchButton = document.querySelector(
                            'button[aria-label="Search"]'
                          ) as HTMLButtonElement | null;
                          if (searchButton) searchButton.click();
                        }
                      }, 100);
                    }}
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
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "flashcards" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Your Saved Flashcards ({savedFlashcards.length})
            </h3>
            {selectedFlashcards.length > 0 && (
              <div className="flex space-x-3">
                <button
                  onClick={exportSelectedFlashcards}
                  className="text-sm text-blue-500 dark:text-blue-400 font-medium hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                >
                  Export Selected ({selectedFlashcards.length})
                </button>
                <button
                  onClick={() => setSelectedFlashcards([])}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {savedFlashcards.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <p>You haven't saved any flashcards yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedFlashcards.map((card, index) => (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden ${
                    selectedFlashcards.includes(index)
                      ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex p-4">
                    <div className="flex items-center pr-4">
                      <input
                        type="checkbox"
                        checked={selectedFlashcards.includes(index)}
                        onChange={() => toggleSelectFlashcard(index)}
                        className="h-4 w-4 text-blue-500 dark:text-blue-400 rounded border-gray-300 dark:border-gray-600 focus:ring focus:ring-blue-500/20 dark:focus:ring-blue-400/20"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded px-2 py-0.5 mr-2">
                          {card.word}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Saved {formatDate(card.savedAt)}
                        </div>
                      </div>
                      <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">
                        {card.front}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {card.back}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFlashcard(index)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 ml-2 p-1"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {savedFlashcards.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => exportSelectedFlashcards()}
                className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                Export All to Anki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
