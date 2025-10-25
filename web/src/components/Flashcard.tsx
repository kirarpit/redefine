import React from "react";
import { ExplanationEntry } from "../types";
import { AnkiDebugPanel } from "./AnkiDebugPanel";
import { FlashcardStateType } from "../hooks/useFlashcardManager";

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
  refreshConnection?: () => void;
  isLoadingFlashcards?: boolean;
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
  refreshConnection,
  isLoadingFlashcards = false,
}) => {
  if (!wordData || "error" in wordData) {
    return null;
  }

  const showLoadingState =
    isLoadingFlashcards &&
    (!wordData.flashcards || wordData.flashcards.length === 0);

  if (
    !showLoadingState &&
    (!wordData.flashcards || wordData.flashcards.length === 0)
  ) {
    return null;
  }

  if (!flashcardState) {
    console.warn("flashcardState is undefined in FlashcardList");
    return <div>Loading flashcards...</div>;
  }

  return (
    <div className="mt-8">
      {ankiState && (
        <AnkiDebugPanel
          debugInfo={ankiState.debugInfo}
          ankiConnectAvailable={ankiState.ankiConnectAvailable}
          toggleDebugInfo={toggleDebugInfo}
          clearLogs={clearLogs}
          refreshConnection={refreshConnection}
        />
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          Anki Flashcards
          {ankiState && !ankiState.debugInfo.showDebug && (
            <span
              className={`ml-2 inline-block w-2 h-2 rounded-full ${
                ankiState.ankiConnectAvailable ? "bg-green-500" : "bg-red-500"
              }`}
              title={
                ankiState.ankiConnectAvailable
                  ? "Anki is connected"
                  : "Anki is not connected"
              }
            ></span>
          )}
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            ) : (
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

      {showLoadingState ? (
        <div className="py-6 flex justify-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm rounded-md text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500 dark:text-blue-300"
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
            Loading flashcards...
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {wordData.flashcards?.map((flashcard, index) => (
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
      )}
    </div>
  );
};
