import { useState, useEffect, FC, useRef, KeyboardEvent } from "react";
import { LLMModel } from "../types";
import {
  fetchModels,
  addModel,
  deleteModel,
  testModel,
  ModelList,
  AddModelForm,
} from "./ModelConfiguration";
import { Card, Button, Section, Toggle } from "./UIComponents";

const API_BASE_URL = "http://localhost:5000/api";

// API service functions for prompt template
const savePromptTemplate = async (template: string): Promise<boolean> => {
  console.log("Saving prompt template", template);
  try {
    const response = await fetch(`${API_BASE_URL}/settings/prompt-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error saving prompt template:", error);
    throw error;
  }
};

const fetchPromptTemplate = async (
  getDefault: boolean = false
): Promise<string | null> => {
  try {
    // Append query parameter for getting default template if requested
    const url = getDefault
      ? `${API_BASE_URL}/settings/prompt-template?default=true`
      : `${API_BASE_URL}/settings/prompt-template`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.error("Error fetching prompt template:", error);
    return null;
  }
};

// Types
type SettingsPanelProps = {
  // Add any props if needed
};

// Feature Components
type PromptTemplateEditorProps = {
  promptTemplate: string;
  onPromptChange: (value: string) => void;
  onResetToDefault: () => void;
  onSaveTemplate: (template: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  hasUnsavedChanges: boolean;
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
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle command+enter or ctrl+enter to save
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for command/ctrl + enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onSaveTemplate(promptTemplate);
    }
  };

  // Adjust textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate new height but set a maximum limit of 400px
    const newHeight = Math.min(textarea.scrollHeight, 400);

    // Set the height with a minimum of 150px
    textarea.style.height = `${Math.max(150, newHeight)}px`;
  }, [promptTemplate]);

  const handleSave = () => {
    onSaveTemplate(promptTemplate);
  };

  return (
    <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
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
          <button
            onClick={onResetToDefault}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            Reset to Default
          </button>
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
      <textarea
        ref={textareaRef}
        value={promptTemplate}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-white dark:bg-gray-800 px-4 py-3 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 min-h-[150px] max-h-[400px] overflow-y-auto border-0"
        placeholder="Enter your prompt template here. Use {word} as a placeholder for the searched word."
      />
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/70 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Use{" "}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-blue-500 dark:text-blue-400">
            {"{word}"}
          </code>{" "}
          as a placeholder for the search term.
          <span className="ml-2 italic">
            Press Cmd+Enter (or Ctrl+Enter) to save.
          </span>
        </p>
      </div>
    </div>
  );
};

type TestPromptSectionProps = {
  testWord: string;
  onTestWordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTest: () => void;
  isGenerating: boolean;
  generatedDefinition: string;
  selectedModel: string;
  modelName: string;
};

const TestPromptSection: FC<TestPromptSectionProps> = ({
  testWord,
  onTestWordChange,
  onTest,
  isGenerating,
  generatedDefinition,
  selectedModel,
  modelName,
}) => {
  // Handle Enter key press for test input
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      !isGenerating &&
      selectedModel &&
      testWord.trim()
    ) {
      e.preventDefault();
      onTest();
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Test Your Prompt
        </h4>
        {selectedModel && (
          <div className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md px-2 py-1">
            Using: <span className="font-medium">{modelName}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={testWord}
          onChange={onTestWordChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter a word to test"
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <Button
          onClick={onTest}
          disabled={isGenerating || !selectedModel || !testWord.trim()}
        >
          {isGenerating ? "Generating..." : "Test"}
        </Button>
      </div>

      {generatedDefinition && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 max-h-60 overflow-y-auto">
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
            {generatedDefinition}
            {isGenerating && <span className="animate-pulse">|</span>}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
const SettingsPanel: React.FC<SettingsPanelProps> = () => {
  // State variables
  const [promptTemplate, setPromptTemplate] = useState<string>("");
  const [originalPromptTemplate, setOriginalPromptTemplate] =
    useState<string>("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [models, setModels] = useState<LLMModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("selectedModel");
    return saved || "";
  });

  const [testWord, setTestWord] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDefinition, setGeneratedDefinition] = useState("");
  const [isAddingModel, setIsAddingModel] = useState(false);

  // Fetch models and prompt template from the backend API
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch models
        const modelData = await fetchModels();
        setModels(modelData);

        // Use a function form of setState to get latest state
        setSelectedModel((currentSelected) => {
          if (!currentSelected && modelData.length > 0) {
            return modelData[0].id;
          }
          return currentSelected;
        });

        // Fetch prompt template
        const savedTemplate = await fetchPromptTemplate();
        if (savedTemplate) {
          setPromptTemplate(savedTemplate);
          setOriginalPromptTemplate(savedTemplate);
        }

        setError(null);
      } catch (err) {
        setError("Failed to load initial data. Please try again later.");
        console.error("Error loading initial data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(promptTemplate !== originalPromptTemplate);
  }, [promptTemplate, originalPromptTemplate]);

  // Add beforeunload event handler for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Standard way to show a confirmation dialog
        const confirmationMessage =
          "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    // Add event listener if there are unsaved changes
    if (hasUnsavedChanges) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    // Clean up
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Persist selected model to localStorage
  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  // Handle saving prompt template to backend
  const handleSavePromptTemplate = async (template: string) => {
    setIsSavingPrompt(true);
    setPromptSaveError(null);
    setPromptSaveSuccess(false);

    try {
      await savePromptTemplate(template);
      setPromptSaveSuccess(true);
      setOriginalPromptTemplate(template); // Update the original template after successful save
      setHasUnsavedChanges(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPromptSaveSuccess(false);
      }, 3000);
    } catch (error) {
      setPromptSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save prompt template"
      );
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    setPromptTemplate(newPrompt);
  };

  const handleAddModel = async (newModel: LLMModel) => {
    // Check for duplicate IDs
    if (models.some((model) => model.id === newModel.id)) {
      alert("A model with this ID already exists. Please use a unique ID.");
      return;
    }

    try {
      // Call API to add model
      await addModel({
        name: newModel.name,
        modelId: newModel.id,
        apiKey: newModel.apiKey,
        apiEndpoint: newModel.apiEndpoint,
      });

      // Update local state after successful API call
      setModels((prev) => [...prev, newModel]);
      setSelectedModel(newModel.id);
      setIsAddingModel(false);
    } catch (error) {
      alert(
        `Failed to add model: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleRemoveModel = async (modelId: string) => {
    if (window.confirm("Are you sure you want to remove this model?")) {
      try {
        await deleteModel(modelId);
        setModels((prev) => prev.filter((model) => model.id !== modelId));

        // If the removed model was selected, reset selection
        if (selectedModel === modelId) {
          const availableModels = models.filter(
            (model) => model.id !== modelId
          );
          setSelectedModel(
            availableModels.length > 0 ? availableModels[0].id : ""
          );
        }
      } catch (error) {
        alert(
          `Failed to remove model: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  };

  const handleResetToDefault = async () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved changes. Are you sure you want to reset to default?"
      )
    ) {
      return;
    }

    try {
      // Fetch the default template directly instead of saving an empty string
      const defaultTemplate = await fetchPromptTemplate(true);
      if (defaultTemplate) {
        // Save the default template to the backend
        await savePromptTemplate(defaultTemplate);

        // Update local state
        setPromptTemplate(defaultTemplate);
        setOriginalPromptTemplate(defaultTemplate);
        setHasUnsavedChanges(false);
        setPromptSaveSuccess(true);

        // Clear success message after 3 seconds
        setTimeout(() => {
          setPromptSaveSuccess(false);
        }, 3000);
      }
    } catch (error) {
      setPromptSaveError(
        error instanceof Error
          ? error.message
          : "Failed to reset prompt template"
      );
    }
  };

  const handleTestPrompt = async () => {
    if (!testWord.trim()) {
      alert("Please enter a word to test");
      return;
    }

    if (!selectedModel) {
      alert("Please select or add a model first");
      return;
    }

    setIsGenerating(true);
    setGeneratedDefinition("");

    const finalPrompt = promptTemplate.replace("{word}", testWord);

    try {
      const response = await testModel(selectedModel, finalPrompt);
      setGeneratedDefinition(response);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
      setGeneratedDefinition(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to generate definition"
        }`
      );
      console.error("Error testing prompt:", error);
    }
  };

  // Display loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Section
        title="Model Configuration"
        description={
          models.length === 0
            ? "To get started with Redefine, add at least one AI model with your API key."
            : "Manage your AI models and API connections. Click on a model to select it as active."
        }
      >
        {!isAddingModel ? (
          <div className="space-y-4">
            {models.length > 0 && (
              <Card title="Your Models">
                <ModelList
                  models={models}
                  onRemove={handleRemoveModel}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                />
              </Card>
            )}

            <Button onClick={() => setIsAddingModel(true)} className="w-full">
              {models.length > 0 ? "Add Another Model" : "Add Your First Model"}
            </Button>
          </div>
        ) : (
          <AddModelForm
            onAdd={handleAddModel}
            onCancel={() => setIsAddingModel(false)}
          />
        )}
      </Section>

      {models.length > 0 && (
        <Section
          title="Definition Generation Settings"
          description="Customize how definitions are generated by editing the prompt template."
        >
          <PromptTemplateEditor
            promptTemplate={promptTemplate}
            onPromptChange={handlePromptChange}
            onResetToDefault={handleResetToDefault}
            onSaveTemplate={handleSavePromptTemplate}
            isSaving={isSavingPrompt}
            saveError={promptSaveError}
            saveSuccess={promptSaveSuccess}
            hasUnsavedChanges={hasUnsavedChanges}
          />

          <TestPromptSection
            testWord={testWord}
            onTestWordChange={(e) => setTestWord(e.target.value)}
            onTest={handleTestPrompt}
            isGenerating={isGenerating}
            generatedDefinition={generatedDefinition}
            selectedModel={selectedModel}
            modelName={
              models.find((m) => m.id === selectedModel)?.name || selectedModel
            }
          />
        </Section>
      )}

      <Section title="Display Settings">
        <div className="space-y-3">
          <Toggle
            label="Enable streaming text effect"
            id="toggleStreaming"
            defaultChecked={true}
          />
          <Toggle label="Auto-save flashcards" id="toggleAutoSave" />
          <Toggle
            label="Show pronunciation guide"
            id="togglePronunciation"
            defaultChecked={true}
          />
        </div>
      </Section>

      <Section title="App Information">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">
              Redefine
            </span>{" "}
            - Version 0.1.0
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Created with ❤️ for smart word learning
          </p>
        </div>
      </Section>
    </div>
  );
};

export default SettingsPanel;
