import { useState, useEffect, FC } from "react";
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
import { API_BASE_URL } from "../config";
import PromptTemplateEditor from "./PromptTemplateEditor";

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
    console.log("Response", response);

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

type TestPromptSectionProps = {
  testQuery: string;
  onTestQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTest: () => void;
  isGenerating: boolean;
  generatedExplanation: string;
  selectedModel: string;
  modelName: string;
};

const TestPromptSection: FC<TestPromptSectionProps> = ({
  testQuery,
  onTestQueryChange,
  onTest,
  isGenerating,
  generatedExplanation,
  selectedModel,
  modelName,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      !isGenerating &&
      selectedModel &&
      testQuery.trim()
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
          value={testQuery}
          onChange={onTestQueryChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter a query to test"
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
        />
        <Button
          onClick={onTest}
          disabled={isGenerating || !selectedModel || !testQuery.trim()}
        >
          {isGenerating ? "Generating..." : "Test"}
        </Button>
      </div>

      {generatedExplanation && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3 max-h-60 overflow-y-auto">
          <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">
            {generatedExplanation}
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

  // Display settings
  const [autoSaveFlashcards, setAutoSaveFlashcards] = useState(() => {
    return localStorage.getItem("autoSaveFlashcards") === "true"; // default to false
  });
  const [enableExpandableEditor, setEnableExpandableEditor] = useState(() => {
    return localStorage.getItem("enableExpandableEditor") !== "false"; // default to true
  });
  const [showAnkiDebugPanel, setShowAnkiDebugPanel] = useState(() => {
    return localStorage.getItem("showAnkiDebugPanel") === "true"; // default to false
  });

  const [testQuery, setTestQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const [isAddingModel, setIsAddingModel] = useState(false);

  // Fetch models and prompt template from the backend API
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch models
        const modelData = await fetchModels();
        console.log("Model data", modelData);
        setModels(modelData || []);

        // Use a function form of setState to get latest state
        setSelectedModel((currentSelected) => {
          // First check if the current selected model exists in the returned models
          if (
            currentSelected &&
            modelData &&
            modelData.some((model) => model.id === currentSelected)
          ) {
            return currentSelected; // Keep current selection if it exists in the returned models
          }

          // If current selected doesn't exist in returned models or there's no selection,
          // default to the first model if available
          if (modelData && modelData.length > 0) {
            return modelData[0].id;
          }

          return ""; // Return empty string if no models available
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

  // Persist display settings to localStorage
  useEffect(() => {
    localStorage.setItem("autoSaveFlashcards", autoSaveFlashcards.toString());
    localStorage.setItem(
      "enableExpandableEditor",
      enableExpandableEditor.toString()
    );
    localStorage.setItem("showAnkiDebugPanel", showAnkiDebugPanel.toString());
  }, [autoSaveFlashcards, enableExpandableEditor, showAnkiDebugPanel]);

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
        name: newModel.name.trim(),
        modelId: newModel.id.trim(),
        apiKey: newModel.apiKey.trim(),
        apiEndpoint: newModel.apiEndpoint?.trim(),
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
    if (!testQuery.trim()) {
      alert("Please enter a query to test");
      return;
    }

    if (!selectedModel) {
      alert("Please select or add a model first");
      return;
    }

    setIsGenerating(true);
    setGeneratedExplanation("");

    const finalPrompt = promptTemplate.replace("{query}", testQuery);

    try {
      const response = await testModel(selectedModel, finalPrompt);
      setGeneratedExplanation(response);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
      setGeneratedExplanation(
        `Error: ${
          error instanceof Error
            ? error.message
            : "Failed to generate explanation"
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
    <div className="space-y-6 settings-container">
      <Section
        title="Model Configuration"
        description={
          !models || models.length === 0
            ? "To get started with Redefine, add at least one AI model with your API key."
            : ""
        }
      >
        {!isAddingModel ? (
          <div className="space-y-4">
            {models && models.length > 0 && (
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
              {models && models.length > 0
                ? "Add Another Model"
                : "Add Your First Model"}
            </Button>
          </div>
        ) : (
          <AddModelForm
            onAdd={handleAddModel}
            onCancel={() => setIsAddingModel(false)}
            models={models || []}
          />
        )}
      </Section>

      {models && models.length > 0 && (
        <Section
          title="Text Generation Settings"
          description="Customize how explanations are generated by editing the prompt template."
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
            expandEnabled={enableExpandableEditor}
          />

          <TestPromptSection
            testQuery={testQuery}
            onTestQueryChange={(e) => setTestQuery(e.target.value)}
            onTest={handleTestPrompt}
            isGenerating={isGenerating}
            generatedExplanation={generatedExplanation}
            selectedModel={selectedModel}
            modelName={
              models.find((m) => m.id === selectedModel)?.name || selectedModel
            }
          />
        </Section>
      )}

      <Section title="Display Settings">
        <div className="space-y-3">
          {/* <Toggle
            label="Auto-save flashcards"
            id="toggleAutoSave"
            defaultChecked={autoSaveFlashcards}
            onChange={(e) => setAutoSaveFlashcards(e.target.checked)}
          /> */}
          <Toggle
            label="Enable expandable prompt editor"
            id="toggleExpandableEditor"
            defaultChecked={enableExpandableEditor}
            onChange={(e) => setEnableExpandableEditor(e.target.checked)}
          />
          <Toggle
            label="Show Anki debug panel"
            id="toggleAnkiDebug"
            defaultChecked={showAnkiDebugPanel}
            onChange={(e) => {
              const newValue = e.target.checked;
              setShowAnkiDebugPanel(newValue);
              // Force a refresh of any visible Anki debug panels
              const event = new CustomEvent("ankiDebugSettingChanged", {
                detail: { showDebug: newValue },
              });
              window.dispatchEvent(event);
            }}
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
            Created with ❤️ for smart learning
          </p>
        </div>
      </Section>
    </div>
  );
};

export default SettingsPanel;
