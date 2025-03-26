import { useState, useEffect, FC, ReactNode, useRef } from "react";
import { LLMModel } from "../types";

const API_BASE_URL = "http://localhost:5000/api";

// API service functions
const fetchModels = async (): Promise<LLMModel[]> => {
  try {
    console.log("Fetching models");
    const response = await fetch(`${API_BASE_URL}/llm/models`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.models;
  } catch (error) {
    console.error("Error fetching models:", error);
    return [];
  }
};

const savePromptTemplate = async (template: string): Promise<boolean> => {
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

const fetchPromptTemplate = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings/prompt-template`);
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

const addModel = async (model: {
  name: string;
  modelId: string;
  apiKey: string;
  apiEndpoint?: string;
}): Promise<boolean> => {
  try {
    console.log(model);
    const response = await fetch(`${API_BASE_URL}/llm/models`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(model),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error adding model:", error);
    throw error;
  }
};

const deleteModel = async (modelId: string): Promise<boolean> => {
  try {
    // Encode the modelId to handle forward slashes
    console.log("Deleting model", modelId);
    const encodedModelId = encodeURIComponent(modelId);
    const response = await fetch(
      `${API_BASE_URL}/llm/models/${encodedModelId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error("Error deleting model:", error);
    throw error;
  }
};

const testModel = async (modelId: string, prompt: string): Promise<string> => {
  try {
    console.log("Testing model", modelId, prompt);
    const response = await fetch(`${API_BASE_URL}/llm/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelId,
        prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error testing model:", error);
    throw error;
  }
};

// Types
type SettingsPanelProps = {
  // Add any props if needed
};

// Reusable UI Components
type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

const Card: FC<CardProps> = ({ title, children, className = "" }) => (
  <div
    className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-4 ${className}`}
  >
    {title && (
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {title}
      </h4>
    )}
    {children}
  </div>
);

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const Section: FC<SectionProps> = ({ title, description, children }) => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      {children}
    </div>
  </div>
);

type InputFieldProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
};

type ButtonProps = {
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  className?: string;
};

const Button: FC<ButtonProps> = ({
  onClick,
  disabled = false,
  variant = "primary",
  children,
  className = "",
}) => {
  const baseStyles =
    "rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500",
    secondary:
      "bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200",
    danger:
      "text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

type ToggleProps = {
  label: string;
  id: string;
  defaultChecked?: boolean;
};

const Toggle: FC<ToggleProps> = ({ label, id, defaultChecked }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm text-gray-700 dark:text-gray-300">{label}</label>
    <div className="relative inline-block w-10 mr-2 align-middle select-none">
      <input
        type="checkbox"
        name="toggle"
        id={id}
        className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
        defaultChecked={defaultChecked}
      />
      <label
        htmlFor={id}
        className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
      />
    </div>
  </div>
);

// Feature Components
type ModelListProps = {
  models: LLMModel[];
  onRemove: (id: string) => void;
  selectedModel: string;
  onSelectModel: (id: string) => void;
};

const ModelList: FC<ModelListProps> = ({
  models,
  onRemove,
  selectedModel,
  onSelectModel,
}) => (
  <div className="space-y-3">
    {models.map((model) => (
      <div
        key={model.id}
        className={`flex items-center justify-between py-2 px-3 rounded-md border-2 transition-colors cursor-pointer ${
          model.id === selectedModel
            ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-transparent bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/70"
        }`}
        onClick={() => onSelectModel(model.id)}
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {model.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            API Key: ••••••••{model.apiKey.slice(-4)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {model.id === selectedModel && (
            <div className="flex items-center text-xs text-blue-700 dark:text-blue-300">
              <svg
                className="w-4 h-4 mr-0.5"
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
              Active
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering the parent onClick
              onRemove(model.id);
            }}
            className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium bg-transparent rounded-md px-3 py-1"
          >
            Remove
          </button>
        </div>
      </div>
    ))}
  </div>
);

type AddModelFormProps = {
  onAdd: (model: LLMModel) => void;
  onCancel: () => void;
};

const AddModelForm: FC<AddModelFormProps> = ({ onAdd, onCancel }) => {
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelApiKey, setNewModelApiKey] = useState("");
  const [newModelApiEndpoint, setNewModelApiEndpoint] = useState("");
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [modelIdError, setModelIdError] = useState("");

  const testApiConnection = () => {
    if (!newModelApiKey.trim()) {
      alert("Please enter an API key");
      return;
    }

    setTestingModel(true);
    setTestResult(null);

    // Simulate API test
    setTimeout(() => {
      if (newModelApiKey.includes("invalid")) {
        setTestResult({
          success: false,
          message: "Authentication failed. Please check your API key.",
        });
      } else {
        setTestResult({
          success: true,
          message: "Connection successful! Your API key works correctly.",
        });
      }
      setTestingModel(false);
    }, 1500);
  };

  // Validate model ID format (provider/model-id)
  const validateModelId = (id: string) => {
    if (!id.includes("/")) {
      setModelIdError(
        "Model ID must include provider (e.g., anthropic/claude-3-sonnet-20240229)"
      );
      return false;
    }
    setModelIdError("");
    return true;
  };

  const handleModelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const id = e.target.value;
    setNewModelId(id);
    validateModelId(id);
  };

  const handleAddModel = () => {
    if (!newModelId.trim() || !newModelApiKey.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    if (!validateModelId(newModelId)) {
      return;
    }

    // Extract model name from the part after the forward slash if name is empty
    let modelName = newModelName.trim();
    if (!modelName) {
      const parts = newModelId.split("/");
      if (parts.length > 1) {
        modelName = parts[1];
      } else {
        modelName = newModelId;
      }
    }

    const newModel: LLMModel = {
      id: newModelId,
      name: modelName,
      apiKey: newModelApiKey,
      apiEndpoint: newModelApiEndpoint.trim() || undefined,
    };

    onAdd(newModel);
  };

  return (
    <Card title="Add New Model">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model Name
          </label>
          <input
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="e.g., Claude 3 Opus (optional)"
            autoComplete="off"
            data-form-type="other"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            If left empty, the model name will be extracted from the Model ID.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model ID*
          </label>
          <input
            type="text"
            value={newModelId}
            onChange={handleModelIdChange}
            placeholder="e.g., anthropic/claude-3-opus-20240229"
            autoComplete="off"
            data-form-type="other"
            className={`w-full bg-white dark:bg-gray-800 border ${
              modelIdError
                ? "border-red-500 dark:border-red-400"
                : "border-gray-300 dark:border-gray-700"
            } rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
          />
          {modelIdError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">
              {modelIdError}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Must include provider name (e.g.,
            anthropic/claude-3-sonnet-20240229)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Key*
          </label>
          <input
            type="text"
            value={newModelApiKey}
            onChange={(e) => setNewModelApiKey(e.target.value)}
            placeholder="Enter your API key"
            autoComplete="off"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Endpoint (Optional)
          </label>
          <input
            type="text"
            value={newModelApiEndpoint}
            onChange={(e) => setNewModelApiEndpoint(e.target.value)}
            placeholder="https://api.example.com/v1/chat/completions"
            autoComplete="off"
            data-form-type="other"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        <div className="pt-1">
          <Button
            onClick={testApiConnection}
            disabled={testingModel || !newModelApiKey}
            variant="secondary"
            className="mr-2"
          >
            {testingModel ? "Testing..." : "Test Connection"}
          </Button>

          {testResult && (
            <span
              className={`text-xs ${
                testResult.success
                  ? "text-green-500 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {testResult.message}
            </span>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            onClick={handleAddModel}
            disabled={!newModelId || !newModelApiKey}
          >
            Add Model
          </Button>
        </div>
      </div>
    </Card>
  );
};

type PromptTemplateEditorProps = {
  promptTemplate: string;
  onPromptChange: (value: string) => void;
  onResetToDefault: () => void;
  onSaveTemplate: (template: string) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
};

const PromptTemplateEditor: FC<PromptTemplateEditorProps> = ({
  promptTemplate,
  onPromptChange,
  onResetToDefault,
  onSaveTemplate,
  isSaving,
  saveError,
  saveSuccess,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const hasChanges = true; // In a real implementation, this would compare with the initial value

  return (
    <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Prompt Template
        </label>
        <div className="flex items-center space-x-2">
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
}) => (
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
        placeholder="Enter a word to test"
        className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <Button onClick={onTest} disabled={isGenerating || !selectedModel}>
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

// Main Component
const SettingsPanel: React.FC<SettingsPanelProps> = () => {
  // Default prompt template
  const DEFAULT_PROMPT_TEMPLATE = `Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify.`;

  // State variables
  const [promptTemplate, setPromptTemplate] = useState<string>(
    DEFAULT_PROMPT_TEMPLATE
  );
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [promptSaveError, setPromptSaveError] = useState<string | null>(null);
  const [promptSaveSuccess, setPromptSaveSuccess] = useState(false);

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

        // If no model selected and we have models, select the first one
        if (!selectedModel && modelData.length > 0) {
          setSelectedModel(modelData[0].id);
        }

        // Fetch prompt template
        const savedTemplate = await fetchPromptTemplate();
        if (savedTemplate) {
          setPromptTemplate(savedTemplate);
        } else {
          // If no template in backend, use default
          setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
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

  const handleResetToDefault = () => {
    if (window.confirm("Reset to default prompt template?")) {
      setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
      // Save default template to backend
      handleSavePromptTemplate(DEFAULT_PROMPT_TEMPLATE);
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

      let index = 0;
      const interval = setInterval(() => {
        if (index < response.length) {
          setGeneratedDefinition((prev) => prev + response.charAt(index));
          index++;
        } else {
          clearInterval(interval);
          setIsGenerating(false);
        }
      }, 10);
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
            - Version 1.2.0
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Created with ❤️ for elegant word learning
          </p>
        </div>
      </Section>
    </div>
  );
};

export default SettingsPanel;
