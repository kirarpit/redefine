import { useEffect, useState } from "react";
import {
  addLog,
  addFlashcardsToAnki,
  AnkiState,
  checkAnkiConnectAvailable,
  createDeckIfNotExists,
  createInitialAnkiState,
  downloadAnkiFile,
  generateAnkiTSV,
  getAvailableDecks,
} from "../services/anki";

export const useAnkiService = () => {
  const showDebugPanel = localStorage.getItem("showAnkiDebugPanel") === "true";

  const [ankiState, setAnkiState] = useState<AnkiState>(
    createInitialAnkiState(showDebugPanel)
  );

  const logToAnki = (
    message: string,
    level: "info" | "error" | "success",
    details?: any,
    skipConsoleLog: boolean = false
  ) => {
    if (!ankiState) {
      console.warn("ankiState is undefined in logToAnki");
      return;
    }
    addLog(setAnkiState, message, level, details, skipConsoleLog);
  };

  const refreshAnkiConnection = async (): Promise<boolean> => {
    if (!ankiState) return false;

    const now = new Date().toLocaleTimeString();
    setAnkiState((prev) => ({
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        connectionAttempts: prev.debugInfo.connectionAttempts + 1,
        lastChecked: now,
      },
    }));

    const customLog = (
      message: string,
      level: "info" | "error" | "success",
      details?: any
    ) => {
      addLog(setAnkiState, message, level, details, true);
    };

    const { success, error } = await checkAnkiConnectAvailable(
      undefined,
      customLog
    );

    setAnkiState((prev) => ({
      ...prev,
      ankiConnectAvailable: success,
      debugInfo: {
        ...prev.debugInfo,
        error,
      },
    }));

    if (!success) {
      return false;
    }

    const decks = await getAvailableDecks(customLog);
    if (decks.length > 0) {
      setAnkiState((prev) => ({
        ...prev,
        decksAvailable: decks,
      }));
    }

    return success;
  };

  const clearLogs = () => {
    if (!ankiState) {
      console.warn("ankiState is undefined in clearLogs");
      return;
    }
    setAnkiState((prev) => ({
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        logs: [],
      },
    }));
  };

  const toggleDebugInfo = () => {
    if (!ankiState) {
      console.warn("ankiState is undefined in toggleDebugInfo");
      return;
    }
    setAnkiState((prev) => {
      const newShowDebug = !prev.debugInfo.showDebug;
      localStorage.setItem("showAnkiDebugPanel", newShowDebug.toString());
      return {
        ...prev,
        debugInfo: {
          ...prev.debugInfo,
          showDebug: newShowDebug,
        },
      };
    });
  };

  useEffect(() => {
    refreshAnkiConnection();

    const handleSettingChange = (
      event: CustomEvent<{ showDebug: boolean }>
    ) => {
      console.log("Anki debug setting changed:", event.detail.showDebug);
      setAnkiState((prev) => ({
        ...prev,
        debugInfo: {
          ...prev.debugInfo,
          showDebug: event.detail.showDebug,
        },
      }));
    };

    window.addEventListener(
      "ankiDebugSettingChanged",
      handleSettingChange as EventListener
    );

    return () => {
      window.removeEventListener(
        "ankiDebugSettingChanged",
        handleSettingChange as EventListener
      );
    };
  }, []);

  const exportToAnki = async (
    flashcards: { front: string; back: string; type?: string }[],
    query: string,
    tags: string[] = [],
    exportedFlashcards: { front: string; back: string; query: string }[] = []
  ): Promise<{
    success: boolean;
    errorMessage?: string;
    exportedCount?: number;
    duplicates?: number;
  }> => {
    try {
      logToAnki(`Exporting ${flashcards.length} flashcards to Anki`, "info");

      if (!ankiState.ankiConnectAvailable) {
        const connected = await refreshAnkiConnection();
        if (!connected) {
          const errorMessage =
            "Could not connect to Anki. Please make sure Anki and AnkiConnect are running.";
          logToAnki(errorMessage, "error");
          return { success: false, errorMessage };
        }
      }

      const deckName = "Redefine";
      const allTags = ["redefine", ...(tags || [])];

      const deckExists = ankiState.decksAvailable.includes(deckName);
      if (!deckExists) {
        logToAnki(
          `Deck '${deckName}' not found in cached decks, checking in Anki...`,
          "info"
        );

        const customLog = (
          message: string,
          level: "info" | "error" | "success",
          details?: any
        ) => {
          logToAnki(message, level, details, true);
        };

        const deckCreated = await createDeckIfNotExists(deckName, customLog);

        if (!deckCreated) {
          const errorMessage = `Could not create deck '${deckName}'. Please create this deck manually in Anki first.`;
          logToAnki(errorMessage, "error");
          return { success: false, errorMessage };
        }
      }

      const newFlashcards: { front: string; back: string; type?: string }[] =
        [];
      const duplicateFlashcards: {
        front: string;
        back: string;
        type?: string;
      }[] = [];

      flashcards.forEach((card) => {
        const isDuplicate = exportedFlashcards.some(
          (existingCard) =>
            existingCard.front === card.front &&
            existingCard.back === card.back
        );

        if (isDuplicate) {
          duplicateFlashcards.push(card);
        } else {
          newFlashcards.push(card);
        }
      });

      const duplicateCount = duplicateFlashcards.length;

      if (duplicateCount > 0) {
        logToAnki(
          `Skipping ${duplicateCount} flashcards that have already been exported to Anki`,
          "info"
        );
      }

      if (newFlashcards.length === 0) {
        logToAnki("No new flashcards to export to Anki", "info");
        return {
          success: false,
          errorMessage:
            "All selected flashcards have already been exported to Anki.",
          exportedCount: 0,
          duplicates: duplicateCount,
        };
      }

      const basicFlashcards: { front: string; back: string }[] = [];
      const clozeFlashcards: { front: string; back: string }[] = [];

      for (const card of newFlashcards) {
        if (card.type === "cloze") {
          if (card.front.includes("{{c") && card.front.includes("}}")) {
            clozeFlashcards.push({ front: card.front, back: card.back || "" });
          } else {
            const clozeText = card.front.replace(
              /\[\[(.*?)\]\]/g,
              "{{c1::$1}}"
            );
            clozeFlashcards.push({ front: clozeText, back: card.back || "" });
          }
        } else {
          basicFlashcards.push({ front: card.front, back: card.back });
        }
      }

      let successCount = 0;

      const customLog = (
        message: string,
        level: "info" | "error" | "success",
        details?: any
      ) => {
        logToAnki(message, level, details, true);
      };

      if (basicFlashcards.length > 0) {
        logToAnki(`Adding ${basicFlashcards.length} basic flashcards`, "info");
        const basicSuccess = await addFlashcardsToAnki(
          basicFlashcards,
          deckName,
          "Basic",
          allTags,
          undefined,
          customLog
        );
        if (basicSuccess) successCount += basicFlashcards.length;
      }

      if (clozeFlashcards.length > 0) {
        logToAnki(`Adding ${clozeFlashcards.length} cloze flashcards`, "info");
        const clozeSuccess = await addFlashcardsToAnki(
          clozeFlashcards,
          deckName,
          "Cloze",
          allTags,
          undefined,
          customLog
        );
        if (clozeSuccess) successCount += clozeFlashcards.length;
      }

      if (successCount > 0) {
        setAnkiState((prev) => ({
          ...prev,
          debugInfo: {
            ...prev.debugInfo,
            logs: [
              {
                timestamp: new Date().toLocaleTimeString(),
                message: `Exported ${successCount} flashcards to Anki (Deck: ${deckName})`,
                level: "success",
              },
              ...prev.debugInfo.logs.slice(0, 19),
            ],
          },
        }));
      }

      if (!ankiState.decksAvailable.includes(deckName)) {
        setAnkiState((prev) => ({
          ...prev,
          decksAvailable: [...prev.decksAvailable, deckName],
        }));
      }

      return {
        success: successCount > 0,
        errorMessage:
          successCount === 0 ? "No flashcards were added to Anki." : undefined,
        exportedCount: successCount,
        duplicates: duplicateCount,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logToAnki(`Error exporting to Anki: ${errorMessage}`, "error", error);
      return { success: false, errorMessage };
    }
  };

  return {
    ankiState,
    clearLogs,
    toggleDebugInfo,
    logToAnki,
    exportToAnki,
    generateAnkiTSV,
    downloadAnkiFile,
    refreshAnkiConnection,
  };
};
