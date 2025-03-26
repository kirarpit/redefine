import { useState, FC, ReactNode } from "react";
import { LLMModel } from "../types";

const API_BASE_URL = "http://localhost:5000/api";

// API service functions for model management
export const fetchModels = async (): Promise<LLMModel[]> => {
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

export const addModel = async (model: {
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

export const deleteModel = async (modelId: string): Promise<boolean> => {
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

export const testModel = async (
  modelId: string,
  prompt: string
): Promise<string> => {
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

// Reusable UI Components
type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export const Card: FC<CardProps> = ({ title, children, className = "" }) => (
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

type ButtonProps = {
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
  className?: string;
};

export const Button: FC<ButtonProps> = ({
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

// Model List Component
type ModelListProps = {
  models: LLMModel[];
  onRemove: (id: string) => void;
  selectedModel: string;
  onSelectModel: (id: string) => void;
};

export const ModelList: FC<ModelListProps> = ({
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

export const AddModelForm: FC<AddModelFormProps> = ({ onAdd, onCancel }) => {
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

// Section component for layout
type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const Section: FC<SectionProps> = ({ title, description, children }) => (
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
