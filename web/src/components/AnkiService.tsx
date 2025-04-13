import React, { useState, useEffect } from "react";

// Types
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
  decksAvailable: string[]; // Add decks cache to state
  debugInfo: AnkiDebugInfo;
};

// Helper function to add a log entry
export const addLog = (
  setAnkiState: React.Dispatch<React.SetStateAction<AnkiState>>,
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

  // Only log to console if not explicitly skipped
  if (!skipConsoleLog) {
    console.log(`[${level.toUpperCase()}] ${message}`, details || "");
  }

  setAnkiState((prev) => {
    if (!prev) {
      // If somehow prev is undefined, create a new state object
      return {
        ankiConnectAvailable: false,
        decksAvailable: [],
        debugInfo: {
          lastChecked: timestamp,
          error: null,
          connectionAttempts: 0,
          showDebug: false,
          logs: [
            {
              timestamp,
              message,
              level,
              details: details || undefined,
            },
          ],
        },
      };
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
          ...((prev.debugInfo && prev.debugInfo.logs) || []).slice(0, 19), // Keep only the latest 20 logs
        ],
      },
    };
  });
};

// Check if AnkiConnect is available
export const checkAnkiConnectAvailable = async (
  setAnkiState?: React.Dispatch<React.SetStateAction<AnkiState>>,
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

// Helper to get available decks from Anki
export const getAvailableDecks = async (
  logFunc: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void
): Promise<string[]> => {
  try {
    // First check which decks are available
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

// Helper to create a deck if it doesn't exist
export const createDeckIfNotExists = async (
  deckName: string,
  logFunc: (
    message: string,
    level: "info" | "error" | "success",
    details?: any
  ) => void,
  availableDecks?: string[] // Now accepts optional pre-fetched decks list
): Promise<boolean> => {
  try {
    // Use provided decks list or fetch it if not provided
    let decks = availableDecks;
    if (!decks || !decks.length) {
      decks = await getAvailableDecks(logFunc);
    }

    // Check if the deck exists
    if (decks.includes(deckName)) {
      logFunc(`Found deck '${deckName}' in Anki`, "success");
      return true;
    }

    // Try to create the deck if it doesn't exist
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

// Add flashcards to Anki
export const addFlashcardsToAnki = async (
  flashcards: { front: string; back: string }[],
  deckName: string = "Redefine",
  modelName: string = "Basic",
  tags: string[] = [],
  setAnkiState?: React.Dispatch<React.SetStateAction<AnkiState>>,
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

  try {
    logFunc(
      `Starting to add ${flashcards.length} flashcards to Anki deck '${deckName}'`,
      "info"
    );

    // Determine if we're using a cloze model
    const isClozeModel = modelName.toLowerCase().includes("cloze");
    logFunc(
      `Using model '${modelName}' (${isClozeModel ? "cloze" : "basic"} type)`,
      "info"
    );

    // Get the field names for the model
    let frontField = "Front";
    let backField = "Back";
    let textField = "Text"; // For cloze models
    let extraField = "Extra"; // For extra info in cloze models
    let successCount = 0;

    // Process each flashcard individually
    for (const card of flashcards) {
      // Create a note in the format required by AnkiConnect with dynamic field names
      const fields: Record<string, string> = {};

      if (isClozeModel) {
        // For cloze models, we put all content in the text field
        fields[textField] = card.front;

        // If there's a back field for the cloze, add it to Extra
        if (card.back) {
          fields[extraField] = card.back;
        }
      } else {
        // For basic models, use front and back fields
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

      // Add note through AnkiConnect
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

      // If we get a note ID back, it was successful
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

// Generate and download Anki TSV file
export const generateAnkiTSV = (
  flashcards: { front: string; back: string }[],
  query: string
): string => {
  // For AnkiDroid, the first line should be the fields separated by tabs
  let tsvContent = "#separator:tab\n";
  tsvContent += "#html:true\n"; // Enable HTML formatting
  tsvContent += "#columns:Front\tBack\tTags\n"; // Define column names

  // Add each flashcard as a row in the TSV file
  flashcards.forEach((card) => {
    // Clean the content to handle tabs, newlines and quotes properly
    const front = `<div>${card.front
      .replace(/\t/g, " ")
      .replace(/\n/g, "<br>")}</div>`;
    const back = `<div>${card.back
      .replace(/\t/g, " ")
      .replace(/\n/g, "<br>")}</div>`;
    // Sanitize the tag (remove spaces, special characters)
    const tag = query
      ? query.toLowerCase().replace(/[^a-z0-9]/gi, "_")
      : "redefine";

    // Add the row to the TSV content
    tsvContent += `${front}\t${back}\t${tag}\n`;
  });

  return tsvContent;
};

// Function to download Anki TSV file
export const downloadAnkiFile = (tsvContent: string, query: string): void => {
  // Create a Blob with the TSV content
  const blob = new Blob([tsvContent], {
    type: "text/tab-separated-values",
  });

  // Create a download link
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;

  // Set the filename with the query and date
  const sanitizedQuery = query
    ? query.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : "flashcards";
  const date = new Date().toISOString().split("T")[0];
  downloadLink.download = `anki_${sanitizedQuery}_${date}.tsv`;

  // Trigger the download
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);

  // Release the URL object
  URL.revokeObjectURL(url);
};

// Hook for managing Anki state
export const useAnkiService = () => {
  // Get debug panel visibility setting from localStorage
  const showDebugPanel = localStorage.getItem("showAnkiDebugPanel") === "true";

  // Initialize state with meaningful defaults
  const [ankiState, setAnkiState] = useState<AnkiState>({
    ankiConnectAvailable: false,
    decksAvailable: [], // Initialize empty decks array
    debugInfo: {
      lastChecked: "Never",
      error: null,
      connectionAttempts: 0,
      showDebug: showDebugPanel,
      logs: [],
    },
  });

  // Helper for logging
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

  // Check Anki connection and get decks (centralized function)
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

    // Create a custom logging function that avoids double-logging
    const customLog = (
      message: string,
      level: "info" | "error" | "success",
      details?: any
    ) => {
      // Use addLog with skipConsoleLog to avoid duplicate console logs
      // (since we'll see the logs in the UI)
      addLog(setAnkiState, message, level, details, true);
    };

    // Check if AnkiConnect is available with custom logging
    const { success, error } = await checkAnkiConnectAvailable(
      undefined, // Skip the setState parameter
      customLog // Use our custom logging function
    );

    if (success) {
      // If connection successful, get available decks
      // Use customLog directly to avoid duplicate logs
      const decks = await getAvailableDecks(customLog);

      setAnkiState((prev) => ({
        ...prev,
        ankiConnectAvailable: true,
        decksAvailable: decks,
        debugInfo: {
          ...prev.debugInfo,
          error: null,
        },
      }));
      return true;
    } else {
      // Update state with error
      setAnkiState((prev) => ({
        ...prev,
        ankiConnectAvailable: false,
        debugInfo: {
          ...prev.debugInfo,
          error: error,
        },
      }));
      return false;
    }
  };

  // Clear logs function
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

  // Toggle debug panel visibility
  const toggleDebugInfo = () => {
    if (!ankiState) {
      console.warn("ankiState is undefined in toggleDebugInfo");
      return;
    }
    setAnkiState((prev) => {
      const newShowDebug = !prev.debugInfo.showDebug;
      // Save the new setting to localStorage
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

  // Setup on component mount
  useEffect(() => {
    // Initial check on component mount
    refreshAnkiConnection();

    // Listen for settings changes
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
  }, []); // Empty dependency array ensures this only runs once

  // Function to export flashcards to Anki - implementing inside the hook for proper scope
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

      // Check connection if needed and refresh decks list
      if (!ankiState.ankiConnectAvailable) {
        const connected = await refreshAnkiConnection();
        if (!connected) {
          logToAnki(
            "AnkiConnect not available, cannot export directly to Anki. Please ensure Anki is running with AnkiConnect plugin installed.",
            "error"
          );
          return {
            success: false,
            errorMessage:
              "AnkiConnect not available. Please ensure Anki is running with AnkiConnect plugin installed.",
          };
        }
      }

      // Create sanitized tag from query
      const sanitizedTag = query
        ? query.toLowerCase().replace(/[^a-z0-9]/gi, "_")
        : "redefine";
      const allTags = [sanitizedTag, ...tags];

      logToAnki(`Using tags: ${allTags.join(", ")}`, "info");

      // Always use "Redefine" deck
      const deckName = "Redefine";

      // Check if the deck exists using the cached deck list
      let deckExists = ankiState.decksAvailable.includes(deckName);

      if (!deckExists) {
        logToAnki(
          `Deck '${deckName}' not found in cached deck list. Will try to create it.`,
          "info"
        );

        // Create custom logger to avoid duplicate logs
        const customLog = (
          message: string,
          level: "info" | "error" | "success",
          details?: any
        ) => {
          logToAnki(message, level, details, true);
        };

        // If deck doesn't exist, try to create it
        const deckCreated = await createDeckIfNotExists(deckName, customLog);

        if (!deckCreated) {
          const errorMessage = `Could not create deck '${deckName}'. Please create this deck manually in Anki first.`;
          logToAnki(errorMessage, "error");
          return { success: false, errorMessage };
        }
      }

      // Filter out flashcards that have already been exported to Anki
      const newFlashcards: { front: string; back: string; type?: string }[] =
        [];
      const duplicateFlashcards: {
        front: string;
        back: string;
        type?: string;
      }[] = [];

      flashcards.forEach((card) => {
        // Check if this card already exists in exportedFlashcards
        const isDuplicate = exportedFlashcards.some(
          (existingCard) =>
            existingCard.front === card.front && existingCard.back === card.back
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

      // Group flashcards by type (cloze vs non-cloze)
      const basicFlashcards: { front: string; back: string }[] = [];
      const clozeFlashcards: { front: string; back: string }[] = [];

      // Prepare flashcards based on their type
      for (const card of newFlashcards) {
        if (card.type === "cloze") {
          // For cloze cards, combine front and back if needed
          // Check if front already has {{c1::}} format
          if (card.front.includes("{{c") && card.front.includes("}}")) {
            clozeFlashcards.push({ front: card.front, back: card.back || "" });
          } else {
            // Convert to cloze format if not already formatted
            const clozeText = card.front.replace(
              /\[\[(.*?)\]\]/g,
              "{{c1::$1}}"
            );
            clozeFlashcards.push({ front: clozeText, back: card.back || "" });
          }
        } else {
          // Regular basic cards
          basicFlashcards.push({ front: card.front, back: card.back });
        }
      }

      let successCount = 0;

      // Create a custom log function for flashcard operations to avoid duplicate logs
      const customLog = (
        message: string,
        level: "info" | "error" | "success",
        details?: any
      ) => {
        logToAnki(message, level, details, true);
      };

      // Add basic cards
      if (basicFlashcards.length > 0) {
        logToAnki(`Adding ${basicFlashcards.length} basic flashcards`, "info");
        const basicSuccess = await addFlashcardsToAnki(
          basicFlashcards,
          deckName,
          "Basic",
          allTags,
          undefined, // Don't pass setAnkiState to avoid duplicate logs
          customLog // Use our custom log function
        );
        if (basicSuccess) successCount += basicFlashcards.length;
      }

      // Add cloze cards
      if (clozeFlashcards.length > 0) {
        logToAnki(`Adding ${clozeFlashcards.length} cloze flashcards`, "info");
        const clozeSuccess = await addFlashcardsToAnki(
          clozeFlashcards,
          deckName,
          "Cloze",
          allTags,
          undefined, // Don't pass setAnkiState to avoid duplicate logs
          customLog // Use our custom log function
        );
        if (clozeSuccess) successCount += clozeFlashcards.length;
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

  // Return all the functions and state that this hook provides
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

// AnkiDebug component for displaying debug information
export const AnkiDebugPanel: React.FC<{
  debugInfo: AnkiDebugInfo;
  ankiConnectAvailable: boolean;
  toggleDebugInfo: () => void;
  clearLogs?: () => void;
  refreshConnection?: () => void;
}> = ({
  debugInfo,
  ankiConnectAvailable,
  toggleDebugInfo,
  clearLogs,
  refreshConnection,
}) => {
  if (!debugInfo) return null;

  // Only show the button if the debug panel should be displayed according to settings
  // or if it's already showing (to allow hiding it)
  const showButton =
    localStorage.getItem("showAnkiDebugPanel") === "true" ||
    debugInfo.showDebug;

  if (!showButton) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={toggleDebugInfo}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {debugInfo.showDebug
            ? "Hide Anki Debug Info"
            : "Show Anki Debug Info"}
        </button>
        {debugInfo.showDebug && (
          <div className="flex space-x-2">
            {refreshConnection && (
              <button
                onClick={refreshConnection}
                className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200"
              >
                Refresh Connection
              </button>
            )}
            {clearLogs && (
              <button
                onClick={clearLogs}
                className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200"
              >
                Clear Logs
              </button>
            )}
          </div>
        )}
      </div>

      {debugInfo.showDebug && (
        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-xs border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold mb-1 text-gray-700 dark:text-gray-300">
            AnkiConnect Debug
          </h4>
          <div className="grid grid-cols-2 gap-1 mb-3">
            <div className="text-gray-600 dark:text-gray-400">Status:</div>
            <div
              className={
                ankiConnectAvailable
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {ankiConnectAvailable ? "Connected" : "Not Connected"}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Last Checked:
            </div>
            <div>{debugInfo.lastChecked}</div>
            <div className="text-gray-600 dark:text-gray-400">
              Connection Attempts:
            </div>
            <div>{debugInfo.connectionAttempts}</div>
            {debugInfo.error && (
              <>
                <div className="text-gray-600 dark:text-gray-400">Error:</div>
                <div className="text-red-600 dark:text-red-400 break-all">
                  {debugInfo.error}
                </div>
              </>
            )}
          </div>

          {/* Operation Logs */}
          {debugInfo.logs && debugInfo.logs.length > 0 && (
            <div className="mt-3">
              <h4 className="font-bold mb-1 text-gray-700 dark:text-gray-300">
                Operation Logs
              </h4>
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded">
                {debugInfo.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`p-1 border-b border-gray-200 dark:border-gray-700 text-xs ${
                      log.level === "error"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                        : log.level === "success"
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="flex items-start">
                      <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 mr-1">
                        {log.timestamp}
                      </span>
                      <span className="break-all">{log.message}</span>
                    </div>
                    {log.details && typeof log.details === "object" && (
                      <div
                        className="ml-4 mt-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer"
                        title="Click to expand/collapse details"
                        onClick={(e) =>
                          e.currentTarget
                            .querySelector(".log-details")
                            ?.classList.toggle("hidden")
                        }
                      >
                        <div className="font-mono log-details hidden whitespace-pre-wrap break-all">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                        <div className="text-blue-500 dark:text-blue-400 text-[10px]">
                          {log.details.error || log.details.result !== undefined
                            ? "(View Details)"
                            : ""}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
