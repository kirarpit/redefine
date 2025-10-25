import React from "react";
import { AnkiDebugInfo } from "../services/anki";

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
                          {log.details.error ||
                          log.details.result !== undefined
                            ? "(View Details)"
                            : "(View Data)"}
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
