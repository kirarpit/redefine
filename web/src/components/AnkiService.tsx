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
  debugInfo: AnkiDebugInfo;
};

// Helper function to add a log entry
export const addLog = (
  setAnkiState: React.Dispatch<React.SetStateAction<AnkiState>>,
  message: string,
  level: "info" | "error" | "success",
  details?: any
) => {
  if (!setAnkiState) {
    console.warn("setAnkiState is undefined in addLog");
    return;
  }

  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${level.toUpperCase()}] ${message}`, details || "");

  setAnkiState((prev) => {
    if (!prev) {
      // If somehow prev is undefined, create a new state object
      return {
        ankiConnectAvailable: false,
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
    console.log("Checking AnkiConnect availability...");

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
      console.log("AnkiConnect response:", data);

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
    console.log("AnkiConnect not available:", errorMessage);

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

// Add flashcards to Anki
export const addFlashcardsToAnki = async (
  flashcards: { front: string; back: string }[],
  deckName: string = "Default",
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

    // First check which decks are available
    logFunc("Checking available Anki decks...", "info");
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
      throw new Error(`Failed to get deck list: ${errorMsg}`);
    }

    const decksResult = await decksResponse.json();
    logFunc("Available decks in Anki:", "info", decksResult);

    const availableDecks = decksResult.result || [];

    // Check if the deck exists or create it if it doesn't
    if (!availableDecks.includes(deckName)) {
      logFunc(
        `Deck '${deckName}' not found. Available decks: ${availableDecks.join(
          ", "
        )}`,
        "error"
      );

      // Try to create the deck
      logFunc(`Attempting to create deck '${deckName}'...`, "info");
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
        throw new Error(`Failed to create deck: ${errorMsg}`);
      }

      const createDeckResult = await createDeckResponse.json();
      logFunc(`Create deck result:`, "info", createDeckResult);

      if (createDeckResult.error) {
        logFunc(
          `Error creating deck: ${createDeckResult.error}`,
          "error",
          createDeckResult
        );
        throw new Error(`Error creating deck: ${createDeckResult.error}`);
      }

      logFunc(`Successfully created deck '${deckName}'`, "success");
    } else {
      logFunc(`Found deck '${deckName}' in Anki`, "success");
    }

    // Get the field names for the model
    let frontField = "Front";
    let backField = "Back";

    try {
      const modelFieldsResponse = await fetch("http://127.0.0.1:8765", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "modelFieldNames",
          version: 6,
          params: {
            modelName: modelName,
          },
        }),
      });

      if (modelFieldsResponse.ok) {
        const modelFieldsResult = await modelFieldsResponse.json();
        const fields = modelFieldsResult.result || [];
        logFunc(`Fields for model '${modelName}':`, "info", fields);

        // Identify front and back fields based on available fields
        if (fields.includes("Front") && fields.includes("Back")) {
          // Standard Basic model
          frontField = "Front";
          backField = "Back";
          logFunc("Using standard Front/Back fields", "info");
        } else if (fields.length >= 2) {
          // Use first two fields available
          frontField = fields[0];
          backField = fields[1];
          logFunc(
            `Using ${frontField}/${backField} as front/back fields`,
            "info"
          );
        } else if (fields.length === 1) {
          // Only one field - put everything in front
          frontField = fields[0];
          backField = fields[0]; // Same field
          logFunc(
            `Only one field available (${frontField}), combining front/back content`,
            "info"
          );
        } else {
          logFunc(
            "No fields found in model, using default Front/Back",
            "error"
          );
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logFunc(`Error getting model fields: ${errorMessage}`, "error");
      // Continue with default fields
    }

    let successCount = 0;

    // Process each flashcard individually
    for (const card of flashcards) {
      // Create a note in the format required by AnkiConnect with dynamic field names
      const fields: Record<string, string> = {};
      fields[frontField] = card.front;

      // If front and back use the same field, combine them
      if (frontField === backField) {
        fields[backField] = `${card.front}<hr>${card.back}`;
      } else {
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
        console.error(errorMsg);
        continue;
      }

      const result = await response.json();
      console.log("AnkiConnect addNote response:", result);

      // If we get a note ID back, it was successful
      if (result.result) {
        logFunc(
          `Successfully added flashcard with ID: ${result.result}`,
          "success",
          result
        );
        successCount++;
      } else if (result.error) {
        // Check if the error is related to the deck
        if (
          result.error.toLowerCase().includes("deck") ||
          result.error.toLowerCase().includes("did")
        ) {
          logFunc(`Deck-related error: ${result.error}`, "error", result);

          // Try to get more details about the deck
          logFunc(`Checking deck details for '${deckName}'...`, "info");
          const deckDetailsResponse = await fetch("http://127.0.0.1:8765", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "getDeckConfig",
              version: 6,
              params: {
                deck: deckName,
              },
            }),
          });

          const deckDetailsResult = await deckDetailsResponse.json();
          logFunc(`Deck details result:`, "info", deckDetailsResult);
        } else {
          logFunc(`Error adding flashcard: ${result.error}`, "error", result);
        }
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
    console.error("Error adding flashcards to Anki:", error);
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
  console.log(
    "Initial Anki debug panel visibility from settings:",
    showDebugPanel
  );

  // Initialize state with meaningful defaults
  const [ankiState, setAnkiState] = useState<AnkiState>({
    ankiConnectAvailable: false,
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
    details?: any
  ) => {
    if (!ankiState) {
      console.warn("ankiState is undefined in logToAnki");
      return;
    }
    addLog(setAnkiState, message, level, details);
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

  // Check if AnkiConnect is available on component mount
  useEffect(() => {
    const checkAnkiConnect = async () => {
      if (!ankiState) {
        console.warn("ankiState is undefined in checkAnkiConnect");
        return;
      }

      const now = new Date().toLocaleTimeString();
      setAnkiState((prev) => ({
        ...prev,
        debugInfo: {
          ...prev.debugInfo,
          connectionAttempts: prev.debugInfo.connectionAttempts + 1,
          lastChecked: now,
        },
      }));

      const { success, error } = await checkAnkiConnectAvailable(setAnkiState);
      setAnkiState((prev) => ({
        ...prev,
        ankiConnectAvailable: success,
        debugInfo: {
          ...prev.debugInfo,
          error: error,
        },
      }));
    };

    checkAnkiConnect();

    // Periodically check for AnkiConnect availability
    const interval = setInterval(checkAnkiConnect, 30000); // Check every 30 seconds

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
      clearInterval(interval);
      window.removeEventListener(
        "ankiDebugSettingChanged",
        handleSettingChange as EventListener
      );
    };
  }, []);

  // Function to export flashcards to Anki
  const exportToAnki = async (
    flashcards: { front: string; back: string }[],
    query: string,
    tags: string[] = []
  ): Promise<boolean> => {
    if (!ankiState) {
      console.warn("ankiState is undefined in exportToAnki");
      return false;
    }

    try {
      logToAnki(`Exporting ${flashcards.length} flashcards to Anki`, "info");

      // Check if AnkiConnect is available
      const { success: ankiConnectChecked } = await checkAnkiConnectAvailable(
        setAnkiState
      );
      if (!ankiConnectChecked) {
        logToAnki(
          "AnkiConnect not available, cannot export directly to Anki",
          "error"
        );
        return false;
      }

      // Create sanitized tag from query
      const sanitizedTag = query
        ? query.toLowerCase().replace(/[^a-z0-9]/gi, "_")
        : "redefine";
      const allTags = [sanitizedTag, ...tags];

      logToAnki(`Using tags: ${allTags.join(", ")}`, "info");

      // First check available decks to choose an appropriate deck name
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

      let deckName = "Redefine"; // Default desired deck name

      if (decksResponse.ok) {
        const decksResult = await decksResponse.json();
        const availableDecks = decksResult.result || [];
        logToAnki("Available Anki decks:", "info", availableDecks);

        // Try to use "Redefine" first, then "Default", then the first available deck
        if (availableDecks.includes("Redefine")) {
          deckName = "Redefine";
          logToAnki(`Using deck 'Redefine'`, "info");
        } else if (availableDecks.includes("Default")) {
          deckName = "Default";
          logToAnki(
            `Deck 'Redefine' not found, using 'Default' instead`,
            "info"
          );
        } else if (availableDecks.length > 0) {
          deckName = availableDecks[0];
          logToAnki(`Using first available deck: '${deckName}'`, "info");
        }
      }

      // Check available note models
      let modelName = "Basic"; // Default model name
      try {
        const modelsResponse = await fetch("http://127.0.0.1:8765", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "modelNames",
            version: 6,
          }),
        });

        if (modelsResponse.ok) {
          const modelsResult = await modelsResponse.json();
          const availableModels = modelsResult.result || [];
          logToAnki("Available Anki models:", "info", availableModels);

          if (availableModels.includes("Basic")) {
            modelName = "Basic";
          } else if (availableModels.length > 0) {
            modelName = availableModels[0];
            logToAnki(
              `Model 'Basic' not found, using '${modelName}' instead`,
              "info"
            );
          }
        }
      } catch (error) {
        logToAnki(
          `Error checking models: ${
            error instanceof Error ? error.message : String(error)
          }`,
          "error",
          error
        );
      }

      // Send flashcards to Anki
      const success = await addFlashcardsToAnki(
        flashcards,
        deckName,
        modelName,
        allTags,
        setAnkiState
      );

      return success;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logToAnki(`Error exporting to Anki: ${errorMessage}`, "error", error);
      return false;
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
  };
};

// AnkiDebug component for displaying debug information
export const AnkiDebugPanel: React.FC<{
  debugInfo: AnkiDebugInfo;
  ankiConnectAvailable: boolean;
  toggleDebugInfo: () => void;
  clearLogs?: () => void;
}> = ({ debugInfo, ankiConnectAvailable, toggleDebugInfo, clearLogs }) => {
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
        {debugInfo.showDebug && clearLogs && (
          <button
            onClick={clearLogs}
            className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-200"
          >
            Clear Logs
          </button>
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

          <div className="mt-2 text-gray-600 dark:text-gray-400">
            <p>
              Note: AnkiConnect only works when Anki is running on the same
              device as this browser.
            </p>
            <p>
              On mobile, install Anki Desktop on your computer and access this
              site from there.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
