import { useState, useEffect } from "react";
import { Flashcard, SearchHistoryItem } from "../types";
import { deleteFlashcard, fetchFlashcards } from "../services/flashcards";
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ClockIcon,
  TrashIcon,
} from "./icons";

type HistoryPanelProps = {
  searchHistory: SearchHistoryItem[];
  setSearchHistory: React.Dispatch<React.SetStateAction<SearchHistoryItem[]>>;
  exportedFlashcards: Flashcard[];
  setExportedFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  onNavigateToSearch: (query: string) => void;
};

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

  const [historyPage, setHistoryPage] = useState<number>(1);
  const [flashcardsPage, setFlashcardsPage] = useState<number>(1);
  const itemsPerPage = 10;

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
      if (index < 0 || index >= sortedFlashcards.length) {
        console.error("Invalid flashcard index:", index);
        return;
      }

      const flashcardToRemove = sortedFlashcards[index];

      const success = await deleteFlashcard({
        front: flashcardToRemove.front,
        back: flashcardToRemove.back,
        query: flashcardToRemove.query,
      });

      if (!success) {
        console.error("Failed to delete flashcard from database");
      }

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

  const sortedHistory = [...searchHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const historyTotalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const historyIndexOfLastItem = historyPage * itemsPerPage;
  const historyIndexOfFirstItem = historyIndexOfLastItem - itemsPerPage;
  const currentHistoryItems = sortedHistory.slice(
    historyIndexOfFirstItem,
    historyIndexOfLastItem
  );

  const paginateHistory = (pageNumber: number) => setHistoryPage(pageNumber);
  const nextHistoryPage = () =>
    setHistoryPage((prev) => Math.min(prev + 1, historyTotalPages));
  const prevHistoryPage = () => setHistoryPage((prev) => Math.max(prev - 1, 1));

  const sortedFlashcards = [...exportedFlashcards].sort(
    (a, b) =>
      new Date(b.exportedAt).getTime() - new Date(a.exportedAt).getTime()
  );

  const flashcardsTotalPages = Math.ceil(
    sortedFlashcards.length / itemsPerPage
  );
  const flashcardsIndexOfLastItem = flashcardsPage * itemsPerPage;
  const flashcardsIndexOfFirstItem = flashcardsIndexOfLastItem - itemsPerPage;
  const currentFlashcardItems = sortedFlashcards.slice(
    flashcardsIndexOfFirstItem,
    flashcardsIndexOfLastItem
  );

  const paginateFlashcards = (pageNumber: number) =>
    setFlashcardsPage(pageNumber);
  const nextFlashcardsPage = () =>
    setFlashcardsPage((prev) => Math.min(prev + 1, flashcardsTotalPages));
  const prevFlashcardsPage = () =>
    setFlashcardsPage((prev) => Math.max(prev - 1, 1));

  const fetchFlashcardsFromDatabase = async (): Promise<void> => {
    try {
      const flashcardsFromDB = await fetchFlashcards();

      if (Array.isArray(flashcardsFromDB) && flashcardsFromDB.length > 0) {
        console.log(
          `Fetched ${flashcardsFromDB.length} flashcards from database`
        );

        const currentFlashcardsString =
          localStorage.getItem("exportedFlashcards") || "[]";
        const currentFlashcards = JSON.parse(
          currentFlashcardsString
        ) as Flashcard[];

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

        const mergedFlashcards = [...currentFlashcards];

        uniqueDbCards.forEach((dbCard: Flashcard) => {
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

        if (mergedFlashcards.length !== currentFlashcards.length) {
          console.log(
            `Updating flashcards: ${currentFlashcards.length} -> ${mergedFlashcards.length}`
          );

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
              <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
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
                      <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

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
              <ArchiveBoxIcon className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" />
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
                          const actualIndex =
                            flashcardsIndexOfFirstItem + index;
                          removeFlashcard(actualIndex);
                        }}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 ml-2 p-1"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

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
