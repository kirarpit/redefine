import { Dispatch, SetStateAction } from "react";

// Constant for the deck name to prevent typos and ensure consistency
export const REDEFINE_DECK_NAME = "Redefine";

export type AnkiDebugInfo = {
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

export type AnkiState = {
  ankiConnectAvailable: boolean;
  decksAvailable: string[];
  debugInfo: AnkiDebugInfo;
};

export const createInitialAnkiState = (
  showDebugPanel: boolean
): AnkiState => ({
  ankiConnectAvailable: false,
  decksAvailable: [],
  debugInfo: {
    lastChecked: "Never",
    error: null,
    connectionAttempts: 0,
    showDebug: showDebugPanel,
    logs: [],
  },
});

export const addLog = (
  setAnkiState: Dispatch<SetStateAction<AnkiState>>,
  message: string,
  level: "info" | "error" | "success",
  details?: any,
  skipConsoleLog: boolean = false
) => {
  if (!setAnkiState) {
    console.warn("setAnkiState is undefined in addLog");
    return;
  }

  const timestamp = new Date().toLocaleTimeString();

  if (!skipConsoleLog) {
    console.log(`[${level.toUpperCase()}] ${message}`, details || "");
  }

  setAnkiState((prev) => {
    if (!prev) {
      return createInitialAnkiState(false);
    }

    return {
      ...prev,
      debugInfo: {
        ...prev.debugInfo,
        logs: [
          {
            timestamp,
            message,
            level,
            details: details || undefined,
          },
          ...((prev.debugInfo && prev.debugInfo.logs) || []).slice(0, 19),
        ],
      },
    };
  });
};

export const checkAnkiConnectAvailable = async (
  setAnkiState?: Dispatch<SetStateAction<AnkiState>>,
  customAddLog?: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void
): Promise<{
  success: boolean;
  error: string | null;
}> => {
  try {
    if (setAnkiState) {
      customAddLog
        ? customAddLog("Checking AnkiConnect availability...", "info")
        : addLog(setAnkiState, "Checking AnkiConnect availability...", "info");
    }

    const response = await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "version",
        version: 6,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const success = data.result >= 6;

      if (setAnkiState) {
        customAddLog
          ? customAddLog(
              `AnkiConnect response: version ${data.result}`,
              success ? "success" : "error",
              data
            )
          : addLog(
              setAnkiState,
              `AnkiConnect response: version ${data.result}`,
              success ? "success" : "error",
              data
            );
      }

      return { success, error: null };
    }

    const errorMsg = `HTTP error: ${response.status}`;
    if (setAnkiState) {
      customAddLog
        ? customAddLog(`AnkiConnect not available: ${errorMsg}`, "error")
        : addLog(
            setAnkiState,
            `AnkiConnect not available: ${errorMsg}`,
            "error"
          );
    }

    return { success: false, error: errorMsg };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (setAnkiState) {
      customAddLog
        ? customAddLog(
            `AnkiConnect not available: ${errorMessage}`,
            "error",
            error
          )
        : addLog(
            setAnkiState,
            `AnkiConnect not available: ${errorMessage}`,
            "error",
            error
          );
    }

    return { success: false, error: errorMessage };
  }
};

export const getAvailableDecks = async (
  logFunc: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void
): Promise<string[]> => {
  try {
    logFunc("Retrieving available Anki decks...", "info");
    const decksResponse = await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "deckNames",
        version: 6,
      }),
    });

    if (!decksResponse.ok) {
      const errorMsg = `HTTP error: ${decksResponse.status}`;
      logFunc(`Failed to get deck list: ${errorMsg}`, "error");
      return [];
    }

    const decksResult = await decksResponse.json();
    logFunc("Available decks in Anki:", "info", decksResult);

    return decksResult.result || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logFunc(`Error getting available decks: ${errorMessage}`, "error", error);
    return [];
  }
};

export const createDeckIfNotExists = async (
  deckName: string,
  logFunc: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void,
  availableDecks?: string[]
): Promise<boolean> => {
  // Safety check: ensure deck name is valid and not empty
  if (!deckName || typeof deckName !== "string" || deckName.trim().length === 0) {
    logFunc(`Invalid deck name provided: ${deckName}`, "error");
    return false;
  }

  try {
    let decks = availableDecks;
    if (!decks || !decks.length) {
      decks = await getAvailableDecks(logFunc);
    }

    if (decks.includes(deckName)) {
      logFunc(`Found deck '${deckName}' in Anki`, "success");
      return true;
    }

    logFunc(`Deck '${deckName}' not found. Will create it.`, "info");
    const createDeckResponse = await fetch("http://127.0.0.1:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "createDeck",
        version: 6,
        params: {
          deck: deckName,
        },
      }),
    });

    if (!createDeckResponse.ok) {
      const errorMsg = `HTTP error: ${createDeckResponse.status}`;
      logFunc(`Failed to create deck: ${errorMsg}`, "error");
      return false;
    }

    const createDeckResult = await createDeckResponse.json();
    logFunc(`Create deck result:`, "info", createDeckResult);

    if (createDeckResult.error) {
      logFunc(
        `Error creating deck: ${createDeckResult.error}`,
        "error",
        createDeckResult
      );
      return false;
    }

    logFunc(`Successfully created deck '${deckName}'`, "success");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logFunc(`Error in createDeckIfNotExists: ${errorMessage}`, "error", error);
    return false;
  }
};

export const addFlashcardsToAnki = async (
  flashcards: { front: string; back: string }[],
  deckName: string = REDEFINE_DECK_NAME,
  modelName: string = "Basic",
  tags: string[] = [],
  setAnkiState?: Dispatch<SetStateAction<AnkiState>>,
  customAddLog?: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void
): Promise<boolean> => {
  const logFunc = (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => {
    if (setAnkiState) {
      customAddLog
        ? customAddLog(message, level, details)
        : addLog(setAnkiState, message, level, details);
    }
  };

  // Safety check: ensure deck name is valid and not empty
  if (!deckName || typeof deckName !== "string" || deckName.trim().length === 0) {
    logFunc(`Invalid deck name provided: ${deckName}`, "error");
    return false;
  }

  try {
    logFunc(
      `Starting to add ${flashcards.length} flashcards to Anki deck '${deckName}'`,
      "info"
    );

    const isClozeModel = modelName.toLowerCase().includes("cloze");
    logFunc(
      `Using model '${modelName}' (${isClozeModel ? "cloze" : "basic"} type)`,
      "info"
    );

    let frontField = "Front";
    let backField = "Back";
    let textField = "Text";
    let extraField = "Extra";
    let successCount = 0;

    for (const card of flashcards) {
      const fields: Record<string, string> = {};

      if (isClozeModel) {
        fields[textField] = card.front;

        if (card.back) {
          fields[extraField] = card.back;
        }
      } else {
        fields[frontField] = card.front;
        fields[backField] = card.back;
      }

      const note = {
        deckName,
        modelName,
        fields,
        tags,
        options: {
          allowDuplicate: false,
        },
      };

      logFunc(
        `Sending flashcard to Anki: "${card.front.substring(0, 30)}${
          card.front.length > 30 ? "..." : ""
        }"`,
        "info",
        note
      );

      const response = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "addNote",
          version: 6,
          params: {
            note,
          },
        }),
      });

      if (!response.ok) {
        const errorMsg = `HTTP error: ${response.status}`;
        logFunc(`Failed to send flashcard: ${errorMsg}`, "error");
        continue;
      }

      const result = await response.json();

      if (result.result) {
        logFunc(
          `Successfully added flashcard with ID: ${result.result}`,
          "success",
          result
        );
        successCount++;
      } else if (result.error) {
        logFunc(`Error adding flashcard: ${result.error}`, "error", result);
      } else {
        logFunc("Unknown response from AnkiConnect", "error", result);
      }
    }

    logFunc(
      `Finished adding flashcards to Anki. Success: ${successCount}/${flashcards.length}`,
      successCount > 0 ? "success" : "error"
    );
    return successCount > 0;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logFunc(`Error in addFlashcardsToAnki: ${errorMessage}`, "error", error);
    throw error;
  }
};

export const generateAnkiTSV = (
  flashcards: { front: string; back: string }[],
  query: string
): string => {
  let tsvContent = "#separator:tab\n";
  tsvContent += "#html:true\n";
  tsvContent += "#columns:Front\tBack\tTags\n";

  flashcards.forEach((card) => {
    const front = `<div>${card.front
      .replace(/\t/g, " ")
      .replace(/\n/g, "<br>")}</div>`;
    const back = `<div>${card.back
      .replace(/\t/g, " ")
      .replace(/\n/g, "<br>")}</div>`;
    const tag = query
      ? query.toLowerCase().replace(/[^a-z0-9]/gi, "_")
      : "redefine";

    tsvContent += `${front}\t${back}\t${tag}\n`;
  });

  return tsvContent;
};

export const downloadAnkiFile = (tsvContent: string, query: string): void => {
  const blob = new Blob([tsvContent], {
    type: "text/tab-separated-values",
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;

  const sanitizedQuery = query
    ? query.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : "flashcards";
  const date = new Date().toISOString().split("T")[0];
  downloadLink.download = `anki_${sanitizedQuery}_${date}.tsv`;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  URL.revokeObjectURL(url);
};
