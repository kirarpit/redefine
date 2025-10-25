import { useState, useEffect, FC } from "react";
import { LLMModel } from "../types";
import { ModelList, AddModelForm } from "./ModelConfiguration";
import { Card, Button, Section, Toggle } from "./UIComponents";
import PromptTemplateEditor from "./PromptTemplateEditor";
import {
  fetchModels,
  addModel,
  deleteModel,
  testModel,
} from "../services/models";
import { PromptType } from "../services/prompts";
import { usePromptTemplates } from "../hooks/usePromptTemplates";

type SettingsPanelProps = {
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

const SettingsPanel: React.FC<SettingsPanelProps> = () => {
  const [activePromptType, setActivePromptType] =
    useState<PromptType>("general");

  const {
    promptStates,
    updateTemplate,
    saveTemplate,
    resetToDefault,
    loadTemplates,
  } = usePromptTemplates();

  const [models, setModels] = useState<LLMModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("selectedModel");
    return saved || "";
  });

  const [autoSaveFlashcards, setAutoSaveFlashcards] = useState(() => {
    return localStorage.getItem("autoSaveFlashcards") === "true";
  });
  const [enableExpandableEditor, setEnableExpandableEditor] = useState(() => {
    return localStorage.getItem("enableExpandableEditor") !== "false";
  });
  const [showAnkiDebugPanel, setShowAnkiDebugPanel] = useState(() => {
    return localStorage.getItem("showAnkiDebugPanel") === "true";
  });
  const [enableStreamingText, setEnableStreamingText] = useState(() => {
    return localStorage.getItem("enableStreamingText") !== "false";
  });

  const [testQuery, setTestQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const [isAddingModel, setIsAddingModel] = useState(false);

  const generalPromptState = promptStates.general;
  const ankiPromptState = promptStates.anki;
  const currentPromptState = promptStates[activePromptType];

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const modelData = await fetchModels();
        setModels(modelData || []);

        setSelectedModel((currentSelected) => {
          if (
            currentSelected &&
            modelData &&
            modelData.some((model) => model.id === currentSelected)
          ) {
            return currentSelected;
          }

          if (modelData && modelData.length > 0) {
            return modelData[0].id;
          }

          return "";
        });

        await loadTemplates();

        setError(null);
      } catch (err) {
        setError("Failed to load initial data. Please try again later.");
        console.error("Error loading initial data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [loadTemplates]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (
        generalPromptState.hasUnsavedChanges ||
        ankiPromptState.hasUnsavedChanges
      ) {
        const confirmationMessage =
          "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = confirmationMessage;
        return confirmationMessage;
      }
    };

    if (
      generalPromptState.hasUnsavedChanges ||
      ankiPromptState.hasUnsavedChanges
    ) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [
    generalPromptState.hasUnsavedChanges,
    ankiPromptState.hasUnsavedChanges,
  ]);

  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("autoSaveFlashcards", autoSaveFlashcards.toString());
    localStorage.setItem(
      "enableExpandableEditor",
      enableExpandableEditor.toString()
    );
    localStorage.setItem("showAnkiDebugPanel", showAnkiDebugPanel.toString());
    localStorage.setItem("enableStreamingText", enableStreamingText.toString());
  }, [
    autoSaveFlashcards,
    enableExpandableEditor,
    showAnkiDebugPanel,
    enableStreamingText,
  ]);

  const handleSavePromptTemplate = (template: string) =>
    saveTemplate(activePromptType, template);

  const handlePromptChange = (newPrompt: string) => {
    updateTemplate(activePromptType, newPrompt);
  };

  const handleAddModel = async (newModel: LLMModel) => {
    if (models.some((model) => model.id === newModel.id)) {
      alert("A model with this ID already exists. Please use a unique ID.");
      return;
    }

    try {
      await addModel({
        name: newModel.name.trim(),
        modelId: newModel.id.trim(),
        apiKey: newModel.apiKey.trim(),
        apiEndpoint: newModel.apiEndpoint?.trim(),
      });

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
    const currentState = promptStates[activePromptType];

    if (
      currentState.hasUnsavedChanges &&
      !window.confirm(
        `You have unsaved changes in the ${activePromptType} prompt. Are you sure you want to reset to default?`
      )
    ) {
      return;
    }

    await resetToDefault(activePromptType);
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

    const { promptTemplate } = promptStates[activePromptType];
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
          description="Customize how explanations are generated by editing the prompt templates."
        >
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activePromptType === "general"
                  ? "border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              onClick={() => setActivePromptType("general")}
            >
              General Prompt
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none ${
                activePromptType === "anki"
                  ? "border-b-2 border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              onClick={() => setActivePromptType("anki")}
            >
              Anki Flashcards Prompt
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {activePromptType === "general"
                ? "This prompt template is used for generating general explanations."
                : "This prompt template is specifically used for generating Anki flashcards."}
            </p>
          </div>

          <PromptTemplateEditor
            promptTemplate={currentPromptState.promptTemplate}
            onPromptChange={handlePromptChange}
            onResetToDefault={handleResetToDefault}
            onSaveTemplate={handleSavePromptTemplate}
            isSaving={currentPromptState.isSaving}
            saveError={currentPromptState.saveError}
            saveSuccess={currentPromptState.saveSuccess}
            hasUnsavedChanges={currentPromptState.hasUnsavedChanges}
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
          <Toggle
            label="Enable expandable prompt editor"
            id="toggleExpandableEditor"
            defaultChecked={enableExpandableEditor}
            onChange={(e) => setEnableExpandableEditor(e.target.checked)}
          />
          <Toggle
            label="Enable streaming text animation"
            id="toggleStreamingText"
            defaultChecked={enableStreamingText}
            onChange={(e) => setEnableStreamingText(e.target.checked)}
          />
          <Toggle
            label="Show Anki debug panel"
            id="toggleAnkiDebug"
            defaultChecked={showAnkiDebugPanel}
            onChange={(e) => {
              const newValue = e.target.checked;
              setShowAnkiDebugPanel(newValue);
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
