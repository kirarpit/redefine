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
import { API_BASE_URL } from "../config";

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

// ---------------------------------------------------------------------------
// AnkiWeb sync section
// ---------------------------------------------------------------------------

type SyncState =
  | { phase: "loading" }
  | { phase: "unavailable" }
  | { phase: "disconnected"; error?: string }
  | { phase: "logging-in" }
  | { phase: "connected"; lastSync: { status: string; error: string | null } };

async function ankiProxyCall(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE_URL}/anki/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

const AnkiWebSyncSection: FC = () => {
  const [syncState, setSyncState] = useState<SyncState>({ phase: "loading" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    ankiProxyCall("syncStatus")
      .then((result: any) => {
        if (result?.connected) {
          setSyncState({ phase: "connected", lastSync: result.lastSync });
        } else {
          setSyncState({ phase: "disconnected" });
        }
      })
      .catch((err: Error) => {
        // HTTP 5xx means the proxy can't reach the anki-server sidecar.
        if (/HTTP 5\d\d/.test(err.message)) {
          setSyncState({ phase: "unavailable" });
        } else {
          setSyncState({ phase: "disconnected" });
        }
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncState({ phase: "logging-in" });
    try {
      await ankiProxyCall("ankiwebLogin", { username: email, password });
      setEmail("");
      setPassword("");
      setShowPassword(false);
      const status = await ankiProxyCall("syncStatus");
      setSyncState({ phase: "connected", lastSync: (status as any).lastSync });
    } catch (err) {
      setSyncState({
        phase: "disconnected",
        error: err instanceof Error ? err.message : "Login failed",
      });
    }
  };

  const handleLogout = async () => {
    await ankiProxyCall("ankiwebLogout").catch(() => {});
    setSyncState({ phase: "disconnected" });
  };

  if (syncState.phase === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
        Checking AnkiWeb connection…
      </div>
    );
  }

  if (syncState.phase === "unavailable") {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">AnkiWeb sync not configured</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">anki-server</code> sidecar to your Docker Compose to enable automatic AnkiWeb sync.
        </p>
        <a
          href="https://github.com/kirarpit/redefine#ankiweb-sync"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Setup instructions →
        </a>
      </div>
    );
  }

  if (syncState.phase === "connected") {
    const { lastSync } = syncState;
    const syncStatusText =
      lastSync.status === "ok"
        ? "Last sync succeeded."
        : lastSync.status === "error"
        ? `Last sync failed: ${lastSync.error}`
        : "Not yet synced this session.";

    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">✓</span>
            <span className="text-sm font-medium text-green-800 dark:text-green-300">Connected to AnkiWeb</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </div>
        <p className="text-xs text-green-700 dark:text-green-400">
          Cards sync to your account automatically after each "Send to Anki". {syncStatusText}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect to{" "}
        <a href="https://ankiweb.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
          AnkiWeb
        </a>{" "}
        to sync cards to AnkiDroid automatically whenever you tap "Send to Anki".
      </p>

      <form onSubmit={handleLogin} className="space-y-3">
        {syncState.phase === "disconnected" && syncState.error && (
          <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {syncState.error}
          </div>
        )}

        <div>
          <label htmlFor="ankiweb-email" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="ankiweb-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="username"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="ankiweb-password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="ankiweb-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 pr-16 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-1">
          <Button
            type="submit"
            disabled={syncState.phase === "logging-in" || !email || !password}
          >
            {syncState.phase === "logging-in" ? "Connecting…" : "Connect"}
          </Button>
          <a
            href="https://ankiweb.net/account/signup"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            Create account →
          </a>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------

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
      const response = await testModel(
        selectedModel,
        finalPrompt,
        undefined,
        undefined,
        false,
        activePromptType
      );
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

      <Section title="AnkiWeb Sync">
        <AnkiWebSyncSection />
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
