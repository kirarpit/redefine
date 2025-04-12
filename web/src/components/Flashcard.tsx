import React, { useState, useEffect } from "react";
import { ExplanationEntry, Flashcard } from "../types";
import { API_BASE_URL } from "../config";
import { useAnkiService, AnkiDebugPanel } from "./AnkiService";

// Types
export type FlashcardStateType = {
  editingFlashcard: {
    index: number;
    isEditing: boolean;
  } | null;
  editedFlashcard: {
    front: string;
    back: string;
  } | null;
  selectedFlashcards: {
    front: string;
    back: string;
  }[];
  exportNotification: {
    message: string;
    type: "success" | "error";
    visible: boolean;
  } | null;
};

// Hook for managing flashcard state and operations
export const useFlashcardManager = (
  wordData: ExplanationEntry | { query: string; error: boolean } | null,
  setWordData: React.Dispatch<
    React.SetStateAction<
      ExplanationEntry | { query: string; error: boolean } | null
    >
  >,
  exportedFlashcards: Flashcard[],
  setExportedFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>
) => {
  const [state, setState] = useState<FlashcardStateType>({
    editingFlashcard: null,
    editedFlashcard: null,
    selectedFlashcards: [],
    exportNotification: null,
  });

  const {
    ankiState,
    clearLogs,
    toggleDebugInfo,
    logToAnki,
    exportToAnki,
    generateAnkiTSV,
    downloadAnkiFile,
  } = useAnkiService();

  if (!ankiState) {
    console.warn("ankiState is undefined in useFlashcardManager");
  }

  useEffect(() => {
    if (state.exportNotification?.visible) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, exportNotification: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.exportNotification]);

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
    return state.selectedFlashcards.some(
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
    if (state.editingFlashcard && state.editingFlashcard.index === index) {
      return;
    }

    const isAlreadySelected = isFlashcardSelected(flashcard);

    if (isAlreadySelected) {
      setState((prev) => ({
        ...prev,
        selectedFlashcards: prev.selectedFlashcards.filter(
          (selected) =>
            !(
              selected.front === flashcard.front &&
              selected.back === flashcard.back
            )
        ),
      }));
    } else {
      setState((prev) => ({
        ...prev,
        selectedFlashcards: [
          ...prev.selectedFlashcards,
          {
            front: flashcard.front,
            back: flashcard.back,
          },
        ],
      }));
    }
  };

  const handleExportToAnki = async (): Promise<void> => {
    if (!wordData || "error" in wordData || !wordData.flashcards) return;

    logToAnki("Starting export to Anki process", "info");

    const flashcardsToExport = wordData.flashcards.filter((flashcard) =>
      isFlashcardSelected(flashcard)
    );

    logToAnki(
      `Selected ${flashcardsToExport.length} flashcards for export`,
      "info"
    );

    if (flashcardsToExport.length === 0) {
      logToAnki("No flashcards selected for export", "error");
      setState((prev) => ({
        ...prev,
        exportNotification: {
          message: "Please select at least one flashcard to export",
          type: "error",
          visible: true,
        },
      }));
      return;
    }

    try {
      logToAnki("Saving flashcards to database", "info");
      // Make API call to save flashcards in the database
      const response = await fetch(`${API_BASE_URL}/flashcards/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flashcards: flashcardsToExport.map((card) => ({
            front: card.front,
            back: card.back,
            query: wordData.query || "",
            exportedAt: new Date().toISOString(),
          })),
          format: "anki",
        }),
      });

      if (!response.ok) {
        const errorMsg = `HTTP error: ${response.status}`;
        logToAnki(
          `Failed to save flashcards to database: ${errorMsg}`,
          "error"
        );
        throw new Error("Failed to save flashcards to database");
      }

      // Get the updated flashcards from the server response
      const result = await response.json();
      logToAnki("Database save response received", "info", result);

      // The server returns savedFlashcards in the saved_flashcards field
      const savedFlashcards = result.saved_flashcards;

      if (savedFlashcards && Array.isArray(savedFlashcards)) {
        logToAnki(
          `Received ${savedFlashcards.length} flashcards from server`,
          "success"
        );

        // Merge with existing flashcards, avoiding duplicates
        // Start with current flashcards
        const mergedFlashcards = [...exportedFlashcards];

        // Add any new flashcards from the server that don't already exist
        let addedCount = 0;
        savedFlashcards.forEach((card: Flashcard) => {
          const isDuplicate = mergedFlashcards.some(
            (existing) =>
              existing.front === card.front &&
              existing.back === card.back &&
              existing.query === card.query
          );

          if (!isDuplicate) {
            mergedFlashcards.push(card);
            addedCount++;
          }
        });

        logToAnki(`Added ${addedCount} new flashcards to local state`, "info");

        // Update local state and localStorage
        setExportedFlashcards(mergedFlashcards);
        localStorage.setItem(
          "exportedFlashcards",
          JSON.stringify(mergedFlashcards)
        );
      } else {
        logToAnki("No saved_flashcards in server response", "error", result);
      }

      // If AnkiConnect is available, send directly to Anki
      if (ankiState.ankiConnectAvailable) {
        try {
          // Create tag from query
          const tag = wordData.query || "redefine";

          // Export to Anki
          const success = await exportToAnki(flashcardsToExport, tag);

          setState((prev) => ({
            ...prev,
            exportNotification: {
              message: success
                ? "Flashcards successfully added to Anki!"
                : "No new flashcards were added to Anki.",
              type: success ? "success" : "error",
              visible: true,
            },
            selectedFlashcards: [],
          }));

          // Return early as we've already handled the export
          return;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logToAnki(
            `Error adding to Anki via AnkiConnect: ${errorMessage}`,
            "error",
            error
          );
          console.error("Error adding to Anki via AnkiConnect:", error);

          // Show a more detailed error to the user
          setState((prev) => ({
            ...prev,
            exportNotification: {
              message: `Error sending to Anki: ${
                error instanceof Error ? error.message : String(error)
              }`,
              type: "error",
              visible: true,
            },
          }));

          // Fall back to file download if AnkiConnect fails
        }
      }

      // Generate and download Anki TSV file as fallback
      const tsvContent = generateAnkiTSV(
        flashcardsToExport,
        wordData.query || ""
      );
      downloadAnkiFile(tsvContent, wordData.query || "");

      setState((prev) => ({
        ...prev,
        exportNotification: {
          message: "Flashcards exported successfully!",
          type: "success",
          visible: true,
        },
        selectedFlashcards: [],
      }));
    } catch (error) {
      console.error("Error saving flashcards:", error);
      setState((prev) => ({
        ...prev,
        exportNotification: {
          message: "Failed to export flashcards. Try again.",
          type: "error",
          visible: true,
        },
      }));
    }
  };

  const startEditingFlashcard = (
    index: number,
    flashcard: { front: string; back: string },
    e?: React.MouseEvent
  ): void => {
    e?.stopPropagation();

    setState((prev) => ({
      ...prev,
      editingFlashcard: { index, isEditing: true },
      editedFlashcard: { ...flashcard },
    }));
  };

  const saveFlashcardEdit = (index: number): void => {
    if (
      !wordData ||
      "error" in wordData ||
      !wordData.flashcards ||
      !state.editedFlashcard
    )
      return;

    const updatedWordData = { ...wordData };
    const editedCard = state.editedFlashcard;
    const isClozeType = wordData.flashcards[index].type === "cloze";

    if (updatedWordData.flashcards && updatedWordData.flashcards[index]) {
      updatedWordData.flashcards[index] = {
        type: wordData.flashcards[index].type,
        front: editedCard.front,
        back: isClozeType ? "" : editedCard.back,
      };
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
                front: editedCard.front,
                back: isClozeType ? "" : editedCard.back,
              }
            : exported
        );
      });
    } else {
      setState((prev) => ({
        ...prev,
        selectedFlashcards: [
          ...prev.selectedFlashcards,
          {
            front: editedCard.front,
            back: editedCard.back,
          },
        ],
      }));
    }

    setState((prev) => ({
      ...prev,
      editingFlashcard: null,
      editedFlashcard: null,
    }));
  };

  const cancelFlashcardEdit = (): void => {
    setState((prev) => ({
      ...prev,
      editingFlashcard: null,
      editedFlashcard: null,
    }));
  };

  const updateEditedFlashcard = (
    field: "front" | "back",
    value: string
  ): void => {
    setState((prev) => {
      if (!prev.editedFlashcard) return prev;

      return {
        ...prev,
        editedFlashcard: {
          ...prev.editedFlashcard,
          [field]: value,
        },
      };
    });
  };

  return {
    state,
    ankiState,
    isFlashcardExported,
    isFlashcardSelected,
    toggleFlashcard,
    handleExportToAnki,
    startEditingFlashcard,
    saveFlashcardEdit,
    cancelFlashcardEdit,
    updateEditedFlashcard,
    toggleDebugInfo: toggleDebugInfo || (() => {}),
    clearLogs: clearLogs || (() => {}),
  };
};

// Flashcard List Component
type FlashcardListProps = {
  wordData: ExplanationEntry | { query: string; error: boolean } | null;
  flashcardState: FlashcardStateType;
  ankiState: {
    ankiConnectAvailable: boolean;
    debugInfo: {
      lastChecked: string;
      error: string | null;
      connectionAttempts: number;
      showDebug: boolean;
      logs: {
        timestamp: string;
        message: string;
        level: "info" | "error" | "success";
        details?: any;
      }[];
    };
  };
  isFlashcardSelected: (flashcard: { front: string; back: string }) => boolean;
  handleExportToAnki: () => void;
  toggleFlashcard: (
    flashcard: { front: string; back: string },
    index: number
  ) => void;
  startEditingFlashcard: (
    index: number,
    flashcard: { front: string; back: string },
    e?: React.MouseEvent
  ) => void;
  saveFlashcardEdit: (index: number) => void;
  cancelFlashcardEdit: () => void;
  updateEditedFlashcard: (field: "front" | "back", value: string) => void;
  toggleDebugInfo: () => void;
  clearLogs?: () => void;
};

export const FlashcardList: React.FC<FlashcardListProps> = ({
  wordData,
  flashcardState,
  ankiState,
  isFlashcardSelected,
  handleExportToAnki,
  toggleFlashcard,
  startEditingFlashcard,
  saveFlashcardEdit,
  cancelFlashcardEdit,
  updateEditedFlashcard,
  toggleDebugInfo,
  clearLogs,
}) => {
  // Check if we have valid data to display
  if (
    !wordData ||
    "error" in wordData ||
    !wordData.flashcards ||
    wordData.flashcards.length === 0
  ) {
    return null;
  }

  // Ensure flashcardState is not undefined
  if (!flashcardState) {
    console.warn("flashcardState is undefined in FlashcardList");
    return <div>Loading flashcards...</div>;
  }

  return (
    <div className="mt-8">
      {/* Anki Debug Panel */}
      {ankiState && (
        <AnkiDebugPanel
          debugInfo={ankiState.debugInfo}
          ankiConnectAvailable={ankiState.ankiConnectAvailable}
          toggleDebugInfo={toggleDebugInfo}
          clearLogs={clearLogs}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
          Anki Flashcards
        </h3>
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
            {ankiState && ankiState.ankiConnectAvailable ? (
              // Icon for direct Anki connection
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
              // Download icon for file export
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            )}
          </svg>
          {ankiState && ankiState.ankiConnectAvailable
            ? "Send to Anki"
            : "Download for Anki"}
        </button>
      </div>

      {flashcardState.exportNotification && (
        <div
          className={`mb-4 px-4 py-3 rounded-md ${
            flashcardState.exportNotification.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800"
              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"
          } flex items-center`}
        >
          {flashcardState.exportNotification.type === "success" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 flex-shrink-0"
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
              className="h-5 w-5 mr-2 flex-shrink-0"
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
          <span className="font-medium">
            {flashcardState.exportNotification.message}
          </span>
        </div>
      )}

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
            {flashcardState.editingFlashcard &&
            flashcardState.editingFlashcard.index === index ? (
              <div className="p-4">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Front
                  </label>
                  <input
                    type="text"
                    value={flashcardState.editedFlashcard?.front || ""}
                    onChange={(e) =>
                      updateEditedFlashcard("front", e.target.value)
                    }
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                  />
                </div>
                {flashcard.type !== "cloze" && (
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Back
                    </label>
                    <input
                      type="text"
                      value={flashcardState.editedFlashcard?.back || ""}
                      onChange={(e) =>
                        updateEditedFlashcard("back", e.target.value)
                      }
                      className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                )}
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
                  {flashcard.type !== "cloze" && (
                    <div className="text-gray-600 dark:text-gray-400 text-sm">
                      {flashcard.back}
                    </div>
                  )}
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
                    onClick={() => toggleFlashcard(flashcard, index)}
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
  );
};
