import { useState, useEffect } from "react";
import { Flashcard, SearchHistoryItem } from "../types";
import { API_BASE_URL } from "../config";

type HistoryPanelProps = {
  searchHistory: SearchHistoryItem[];
  setSearchHistory: React.Dispatch<React.SetStateAction<SearchHistoryItem[]>>;
  exportedFlashcards: Flashcard[];
  setExportedFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  onNavigateToSearch: (query: string) => void;
};

// Reusable pagination component
type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  paginate: (pageNumber: number) => void;
  nextPage: () => void;
  prevPage: () => void;
};

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  paginate,
  nextPage,
  prevPage,
}) => {
  // Generate page numbers array
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4 space-x-1">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            &laquo;
          </button>

          {pageNumbers.map((number) => {
            // Show limited page numbers with ellipsis for many pages
            if (
              totalPages <= 7 ||
              number === 1 ||
              number === totalPages ||
              (number >= currentPage - 1 && number <= currentPage + 1)
            ) {
              return (
                <button
                  key={number}
                  onClick={() => paginate(number)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    currentPage === number
                      ? "bg-blue-500 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {number}
                </button>
              );
            }

            // Add ellipsis
            if (
              (number === 2 && currentPage > 3) ||
              (number === totalPages - 1 && currentPage < totalPages - 2)
            ) {
              return (
                <span key={number} className="px-1">
                  ...
                </span>
              );
            }

            return null;
          })}

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            &raquo;
          </button>
        </div>
      )}
    </>
  );
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  searchHistory,
  setSearchHistory,
  exportedFlashcards,
  setExportedFlashcards,
  onNavigateToSearch,
}) => {
  const [activeTab, setActiveTab] = useState<"history" | "flashcards">(
    "history"
  );

  // Separate pagination state for each tab
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [flashcardsPage, setFlashcardsPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Reset pagination when switching tabs
  const handleTabChange = (tab: "history" | "flashcards") => {
    setActiveTab(tab);
  };

  const clearHistory = (): void => {
    const userConfirmed = window.confirm(
      "Are you sure you want to clear your search history?"
    );
    if (userConfirmed) {
      setSearchHistory([]);
      localStorage.setItem("searchHistory", JSON.stringify([]));
    }
  };

  const removeFlashcard = async (index: number): Promise<void> => {
    try {
      // Get the flashcard based on the index in the sorted array
      if (index < 0 || index >= sortedFlashcards.length) {
        console.error("Invalid flashcard index:", index);
        return;
      }

      const flashcardToRemove = sortedFlashcards[index];

      // Make API call to delete the flashcard from the database
      const response = await fetch(`${API_BASE_URL}/flashcards/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          front: flashcardToRemove.front,
          back: flashcardToRemove.back,
          query: flashcardToRemove.query,
        }),
      });

      if (!response.ok) {
        console.error("Failed to delete flashcard from database");
      }

      // Update local state regardless of API success
      // Filter out the deleted flashcard based on its content, not index
      const newFlashcards = exportedFlashcards.filter(
        (card) =>
          card.front !== flashcardToRemove.front ||
          card.back !== flashcardToRemove.back ||
          card.query !== flashcardToRemove.query
      );

      setExportedFlashcards(newFlashcards);
      localStorage.setItem("exportedFlashcards", JSON.stringify(newFlashcards));
    } catch (error) {
      console.error("Error deleting flashcard:", error);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Sort search history by timestamp in descending order (newest first)
  const sortedHistory = [...searchHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // History pagination values
  const historyTotalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const historyIndexOfLastItem = historyPage * itemsPerPage;
  const historyIndexOfFirstItem = historyIndexOfLastItem - itemsPerPage;
  const currentHistoryItems = sortedHistory.slice(
    historyIndexOfFirstItem,
    historyIndexOfLastItem
  );

  // History pagination handlers
  const paginateHistory = (pageNumber: number) => setHistoryPage(pageNumber);
  const nextHistoryPage = () =>
    setHistoryPage((prev) => Math.min(prev + 1, historyTotalPages));
  const prevHistoryPage = () => setHistoryPage((prev) => Math.max(prev - 1, 1));

  // Sort flashcards by exportedAt date in descending order (newest first)
  const sortedFlashcards = [...exportedFlashcards].sort(
    (a, b) =>
      new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
  );

  // Flashcards pagination values
  const flashcardsTotalPages = Math.ceil(
    sortedFlashcards.length / itemsPerPage
  );
  const flashcardsIndexOfLastItem = flashcardsPage * itemsPerPage;
  const flashcardsIndexOfFirstItem = flashcardsIndexOfLastItem - itemsPerPage;
  const currentFlashcardItems = sortedFlashcards.slice(
    flashcardsIndexOfFirstItem,
    flashcardsIndexOfLastItem
  );

  // Flashcards pagination handlers
  const paginateFlashcards = (pageNumber: number) =>
    setFlashcardsPage(pageNumber);
  const nextFlashcardsPage = () =>
    setFlashcardsPage((prev) => Math.min(prev + 1, flashcardsTotalPages));
  const prevFlashcardsPage = () =>
    setFlashcardsPage((prev) => Math.max(prev - 1, 1));

  // Fetch flashcards from the database
  const fetchFlashcardsFromDatabase = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/flashcards/`);

      if (!response.ok) {
        console.error("Failed to fetch flashcards from database");
        return;
      }

      const flashcardsFromDB = await response.json();

      // Only update if we got data from the server
      if (Array.isArray(flashcardsFromDB) && flashcardsFromDB.length > 0) {
        console.log(
          `Fetched ${flashcardsFromDB.length} flashcards from database`
        );

        // Get current flashcards from localStorage to avoid state dependency
        const currentFlashcardsString =
          localStorage.getItem("exportedFlashcards") || "[]";
        const currentFlashcards = JSON.parse(
          currentFlashcardsString
        ) as Flashcard[];

        // Remove any duplicates within the database flashcards themselves
        const uniqueDbCards: Flashcard[] = [];
        flashcardsFromDB.forEach((dbCard: Flashcard) => {
          const isDuplicateInDb = uniqueDbCards.some(
            (card) =>
              card.front === dbCard.front &&
              card.back === dbCard.back &&
              card.query === dbCard.query
          );

          if (!isDuplicateInDb) {
            uniqueDbCards.push(dbCard);
          }
        });

        // Combine with local flashcards, avoiding duplicates
        const mergedFlashcards = [...currentFlashcards];

        uniqueDbCards.forEach((dbCard: Flashcard) => {
          // Check if this card already exists in our local set
          const exists = mergedFlashcards.some(
            (localCard) =>
              localCard.front === dbCard.front &&
              localCard.back === dbCard.back &&
              localCard.query === dbCard.query
          );

          if (!exists) {
            mergedFlashcards.push(dbCard);
          }
        });

        // Only update if there are changes
        if (mergedFlashcards.length !== currentFlashcards.length) {
          console.log(
            `Updating flashcards: ${currentFlashcards.length} -> ${mergedFlashcards.length}`
          );

          // Update state and localStorage
          setExportedFlashcards(mergedFlashcards);
          localStorage.setItem(
            "exportedFlashcards",
            JSON.stringify(mergedFlashcards)
          );
        }
      }
    } catch (error) {
      console.error("Error fetching flashcards from database:", error);
    }
  };

  // Fetch flashcards when component mounts
  useEffect(() => {
    fetchFlashcardsFromDatabase();
  }, []);

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => handleTabChange("history")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Search History
        </button>
        <button
          onClick={() => handleTabChange("flashcards")}
          className={`py-2 px-4 text-sm font-medium transition-colors ${
            activeTab === "flashcards"
              ? "border-b-2 border-blue-500 text-blue-500 dark:text-blue-400 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Exported Flashcards
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
            <div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {currentHistoryItems.map((item, index) => (
                  <div key={index} className="py-3 flex items-center">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {item.query}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(item.timestamp)}
                      </div>
                    </div>
                    <button
                      className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                      onClick={() => {
                        onNavigateToSearch(item.query);
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

              {/* History Pagination controls */}
              <PaginationControls
                currentPage={historyPage}
                totalPages={historyTotalPages}
                paginate={paginateHistory}
                nextPage={nextHistoryPage}
                prevPage={prevHistoryPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === "flashcards" && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Your Exported Flashcards ({exportedFlashcards.length})
            </h3>
          </div>

          {exportedFlashcards.length === 0 ? (
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
              <p>You haven't exported any flashcards yet</p>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {currentFlashcardItems.map((card, index) => (
                  <div
                    key={index}
                    className="border rounded-lg overflow-hidden border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex p-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded px-2 py-0.5 mr-2">
                            {card.query}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Exported {formatDate(card.exportedAt)}
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
                        onClick={() => {
                          // Calculate the actual index in the full exportedFlashcards array
                          const actualIndex =
                            flashcardsIndexOfFirstItem + index;
                          // Use the actual index when removing the flashcard
                          removeFlashcard(actualIndex);
                        }}
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

              {/* Flashcards Pagination controls */}
              <PaginationControls
                currentPage={flashcardsPage}
                totalPages={flashcardsTotalPages}
                paginate={paginateFlashcards}
                nextPage={nextFlashcardsPage}
                prevPage={prevFlashcardsPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
