import { useState, useEffect, FC, useRef, KeyboardEvent } from "react";
import { Button } from "./UIComponents";

export type PromptTemplateEditorProps = {
  promptTemplate: string;
  onPromptChange: (value: string) => void;
  onResetToDefault: () => void;
  onSaveTemplate: (template: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  hasUnsavedChanges: boolean;
  expandEnabled?: boolean;
};

const PromptTemplateEditor: FC<PromptTemplateEditorProps> = ({
  promptTemplate,
  onPromptChange,
  onResetToDefault,
  onSaveTemplate,
  isSaving,
  saveError,
  saveSuccess,
  hasUnsavedChanges,
  expandEnabled = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      onSaveTemplate(promptTemplate);
    }

    if (e.key === "Escape" && isExpanded) {
      e.preventDefault();
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    const handleGlobalEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleGlobalEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalEscape);
    };
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isExpanded &&
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        editorRef.current &&
        editorRef.current.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpanded]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const lines = promptTemplate.split("\n").length;
    setLineCount(lines);

    if (!isExpanded) {
      textarea.style.height = "auto";

      const contentBasedHeight = lines * 24 + 40;

      const minHeight = lines <= 2 ? 150 : 200;
      const newHeight = Math.min(Math.max(minHeight, contentBasedHeight), 400);

      textarea.style.height = `${newHeight}px`;
    }
  }, [promptTemplate, isExpanded]);

  const handleSave = () => {
    onSaveTemplate(promptTemplate);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    if (!isExpanded && expandEnabled) {
      setIsExpanded(true);
      e.stopPropagation();

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === editorRef.current) {
      setIsExpanded(false);
    }
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPromptChange(e.target.value);
    setLineCount(e.target.value.split("\n").length);
  };

  const handleResetClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowResetConfirmation(true);
  };

  const handleConfirmReset = () => {
    onResetToDefault();
    setShowResetConfirmation(false);
  };

  const handleCancelReset = () => {
    setShowResetConfirmation(false);
  };

  const getModalDimensions = () => {
    if (typeof window === "undefined") return {};

    const isMobile = window.innerWidth < 640;
    const modalHeight = isMobile
      ? `${Math.min(
          window.innerHeight * 0.9,
          Math.max(400, lineCount * 24 + 120)
        )}px`
      : `${Math.min(
          Math.max(500, lineCount * 24 + 120),
          window.innerHeight * 0.8
        )}px`;

    return {
      height: modalHeight,
    };
  };

  const ResetButton = ({ mobile = false }) => (
    <button
      onClick={handleResetClick}
      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/30 flex items-center"
      title="Reset to default template"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-3.5 w-3.5 mr-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span>Reset</span>
    </button>
  );

  const ResetConfirmation = () => (
    <div className="flex items-center space-x-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md px-2 py-1.5">
      <span className="text-xs text-yellow-600 dark:text-yellow-300 font-medium">
        Reset?
      </span>
      <button
        onClick={handleConfirmReset}
        className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-0.5 rounded bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
      >
        Yes
      </button>
      <button
        onClick={handleCancelReset}
        className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        No
      </button>
    </div>
  );

  return (
    <>
      {/* Normal view */}
      {!isExpanded && (
        <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-text">
          <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Prompt Template
            </label>
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-500 dark:text-yellow-400 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  Unsaved changes
                </span>
              )}
              {saveSuccess && (
                <span className="text-xs text-green-500 dark:text-green-400 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <svg
                    className="w-3 h-3 inline-block mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Saved!
                </span>
              )}
              {saveError && (
                <span className="text-xs text-red-500 dark:text-red-400 px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                  Error: {saveError}
                </span>
              )}
              {!showResetConfirmation ? <ResetButton /> : <ResetConfirmation />}
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant="primary"
                className="ml-2 text-xs py-1 px-3"
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div
            onClick={expandEnabled ? handleExpandClick : undefined}
            className={expandEnabled ? "cursor-pointer" : ""}
          >
            <textarea
              ref={textareaRef}
              value={promptTemplate}
              onChange={handlePromptChange}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 border-0 font-mono text-sm min-h-[150px] max-h-[400px] overflow-y-auto"
              placeholder="Enter your prompt template here. Use {query} as a placeholder for the search term."
            />
          </div>

          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Use{" "}
              <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-blue-500 dark:text-blue-400">
                {"{query}"}
              </code>{" "}
              as a placeholder for the search term.
            </p>
          </div>
        </div>
      )}

      {/* Expanded dialog view - only show if expand is enabled */}
      {isExpanded && expandEnabled && (
        <div
          ref={editorRef}
          className="fixed z-40 inset-0 bg-black/20 dark:bg-black/40 flex items-center justify-center p-4 sm:p-6"
          onClick={handleOverlayClick}
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 w-full sm:w-[90%] max-w-[1400px]"
            style={getModalDimensions()}
          >
            <div className="flex justify-between items-center px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Prompt Template
                </label>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                {hasUnsavedChanges && (
                  <span className="text-xs text-yellow-500 dark:text-yellow-400 px-1 sm:px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <span className="hidden sm:inline">Unsaved changes</span>
                    <span className="sm:hidden">*</span>
                  </span>
                )}
                {saveSuccess && (
                  <span className="text-xs text-green-500 dark:text-green-400 px-1 sm:px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <svg
                      className="w-3 h-3 inline-block mr-0 sm:mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="hidden sm:inline">Saved!</span>
                  </span>
                )}
                {saveError && (
                  <span className="text-xs text-red-500 dark:text-red-400 px-1 sm:px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <span className="sm:hidden">Error</span>
                    <span className="hidden sm:inline">Error: {saveError}</span>
                  </span>
                )}
                <div className="flex items-center space-x-2">
                  {!showResetConfirmation ? (
                    <ResetButton mobile={true} />
                  ) : (
                    <ResetConfirmation />
                  )}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700/30 flex items-center"
                    title="Close editor (Esc)"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <span className="hidden sm:inline">Close</span>
                  </button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    variant="primary"
                    className="ml-1 sm:ml-2 text-xs py-1 px-2 sm:px-3"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative flex-1 min-h-0">
              <textarea
                ref={textareaRef}
                value={promptTemplate}
                onChange={handlePromptChange}
                onKeyDown={handleKeyDown}
                className="w-full h-full resize-none bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 border-0 font-mono text-sm"
                placeholder="Enter your prompt template here. Use {query} as a placeholder for the search term."
                style={{
                  lineHeight: "1.5rem",
                }}
              />
            </div>

            <div className="px-3 sm:px-4 py-2 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex justify-between items-center flex-wrap sm:flex-nowrap">
                <p className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                  Use{" "}
                  <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-blue-500 dark:text-blue-400">
                    {"{query}"}
                  </code>{" "}
                  as a placeholder
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                  <span className="bg-gray-100 dark:bg-gray-700 px-1 rounded mr-1 sm:mx-2">
                    Ctrl/⌘+S
                  </span>{" "}
                  <span className="hidden sm:inline">to save</span>
                  <span className="bg-gray-100 dark:bg-gray-700 px-1 rounded mx-1 sm:mx-2">
                    Esc
                  </span>{" "}
                  <span className="hidden sm:inline">to close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptTemplateEditor;
