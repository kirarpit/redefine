import { Dispatch, MouseEvent, SetStateAction, useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { ExplanationEntry, Flashcard } from "../types";
import { useAnkiService } from "../components/AnkiService";

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

export const useFlashcardManager = (
  wordData: ExplanationEntry | { query: string; error: boolean } | null,
  setWordData: Dispatch<
    SetStateAction<
      ExplanationEntry | { query: string; error: boolean } | null
    >
  >,
  exportedFlashcards: Flashcard[],
  setExportedFlashcards: Dispatch<SetStateAction<Flashcard[]>>
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
    refreshAnkiConnection,
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

      const result = await response.json();
      logToAnki("Database save response received", "info", result);

      const savedFlashcards = result.saved_flashcards;

      if (savedFlashcards && Array.isArray(savedFlashcards)) {
        logToAnki(
          `Received ${savedFlashcards.length} flashcards from server`,
          "success"
        );

        const mergedFlashcards = [...exportedFlashcards];

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

        setExportedFlashcards(mergedFlashcards);
        localStorage.setItem(
          "exportedFlashcards",
          JSON.stringify(mergedFlashcards)
        );
      } else {
        logToAnki("No saved_flashcards in server response", "error", result);
      }

      if (ankiState.ankiConnectAvailable) {
        try {
          const tag = wordData.query || "redefine";

          const result = await exportToAnki(
            flashcardsToExport,
            tag,
            [],
            exportedFlashcards
          );

          let message = "";
          if (result.success) {
            message = `${result.exportedCount} flashcard${
              result.exportedCount !== 1 ? "s" : ""
            } successfully added to Anki`;
            if (result.duplicates && result.duplicates > 0) {
              message += ` (${result.duplicates} duplicate${
                result.duplicates !== 1 ? "s" : ""
              } skipped)`;
            }
          } else {
            if (result.duplicates && result.duplicates > 0) {
              message = `No new flashcards added to Anki - ${
                result.duplicates
              } duplicate${result.duplicates !== 1 ? "s" : ""} skipped`;
            } else {
              message =
                result.errorMessage || "Failed to add flashcards to Anki";
            }
          }

          setState((prev) => ({
            ...prev,
            exportNotification: {
              message,
              type: result.success ? "success" : "error",
              visible: true,
            },
            selectedFlashcards: [],
          }));

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

          setState((prev) => ({
            ...prev,
            exportNotification: {
              message: `Error sending to Anki: ${errorMessage}`,
              type: "error",
              visible: true,
            },
          }));
        }
      }

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
    e?: MouseEvent
  ): void => {
    e?.stopPropagation();

    setState((prev) => ({
      ...prev,
      editingFlashcard: { index, isEditing: true },
      editedFlashcard: JSON.parse(JSON.stringify(flashcard)),
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
    refreshAnkiConnection:
      refreshAnkiConnection || (() => Promise.resolve(false)),
  };
};
