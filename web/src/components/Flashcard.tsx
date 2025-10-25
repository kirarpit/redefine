import React from "react";
import { ExplanationEntry } from "../types";
import { AnkiDebugPanel } from "./AnkiDebugPanel";
import {
  ArrowDownTrayIcon,
  CheckCircleIcon,
  CheckIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  SpinnerIcon,
  WarningIcon,
} from "./icons";
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
          {ankiState && ankiState.ankiConnectAvailable ? (
            <CheckIcon className="h-4 w-4 mr-2" />
          ) : (
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
          )}
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
            <CheckCircleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
          ) : (
            <WarningIcon className="h-5 w-5 mr-2 flex-shrink-0" />
          )}
          <span className="font-medium">
            {flashcardState.exportNotification.message}
          </span>
        </div>
      )}

      {showLoadingState ? (
        <div className="py-6 flex justify-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm rounded-md text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300">
            <SpinnerIcon className="-ml-1 mr-3 h-5 w-5 text-blue-500 dark:text-blue-300" />
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
                      <PencilSquareIcon className="h-5 w-5" />
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
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <PlusCircleIcon className="h-5 w-5" />
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
