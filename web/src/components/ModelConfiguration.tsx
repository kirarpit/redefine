import { useState, FC } from "react";
import { LLMModel } from "../types";
import { Card, Button } from "./UIComponents";

const API_BASE_URL = "http://localhost:5000/api";

// API service functions for model management
export const fetchModels = async (): Promise<LLMModel[]> => {
  try {
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
  prompt: string,
  apiKey?: string,
  apiEndpoint?: string,
  skipLookup?: boolean
): Promise<string> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/llm/test?skipLookup=${skipLookup}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          modelId,
          prompt,
          apiKey,
          apiEndpoint,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error(error);
    throw error;
  }
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

  // Modify the testApiConnection function to make it reusable and return a promise
  const testApiConnection = async (showUI = true): Promise<boolean> => {
    if (!newModelApiKey.trim()) {
      alert("Please enter an API key");
      return false;
    }

    if (!newModelId.trim()) {
      alert("Please enter a Model ID");
      return false;
    }

    if (showUI) {
      setTestingModel(true);
      setTestResult(null);
    }

    try {
      // Create temporary model ID for testing
      const tempModelId = newModelId;
      const testPrompt = "hello world";

      // Make a real API call to test the model
      await testModel(
        tempModelId,
        testPrompt,
        newModelApiKey,
        newModelApiEndpoint,
        true
      );

      if (showUI) {
        setTestResult({
          success: true,
          message: "Connection successful! Your API key works correctly.",
        });
      }

      return true;
    } catch (error: any) {
      if (showUI) {
        setTestResult({
          success: false,
          message:
            error.message ||
            "Failed to connect. Please check your API details.",
        });
      }
      return false;
    } finally {
      if (showUI) {
        setTestingModel(false);
      }
    }
  };

  // Button click handler for the Test Connection button
  const handleTestButtonClick = () => {
    testApiConnection(true);
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

  const handleAddModel = async () => {
    if (!newModelId.trim() || !newModelApiKey.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    if (!validateModelId(newModelId)) {
      return;
    }

    // Always test the model before adding it
    setTestingModel(true);
    const testSuccess = await testApiConnection(true);

    // Only proceed if the test is successful
    if (!testSuccess) {
      return; // Exit without adding the model
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
            Model Name (Optional)
          </label>
          <input
            type="text"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            placeholder="e.g., Claude 3 Opus"
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
            onClick={handleTestButtonClick}
            disabled={testingModel || !newModelApiKey}
            variant="secondary"
            className="mr-2"
          >
            {testingModel ? "Testing..." : "Test Connection"}
          </Button>

          {testResult && (
            <div
              className={`mt-2 p-3 rounded-md flex items-start ${
                testResult.success
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              {testResult.success ? (
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5"
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
              ) : (
                <svg
                  className="w-5 h-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    testResult.success
                      ? "text-green-800 dark:text-green-300"
                      : "text-red-800 dark:text-red-300"
                  }`}
                >
                  {testResult.success
                    ? "Connection Successful"
                    : "Connection Failed"}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    testResult.success
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {testResult.message}
                </p>
                {!testResult.success && (
                  <ul className="text-xs text-red-700 dark:text-red-400 mt-1 ml-4 list-disc">
                    <li>
                      Check your provider is supported:{" "}
                      <a
                        href="https://docs.litellm.ai/docs/providers"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        https://docs.litellm.ai/docs/providers
                      </a>
                    </li>
                    <li>Check that the model ID is valid for your provider</li>
                    <li>Verify your API key is correct and hasn't expired</li>
                    <li>Ensure your API endpoint is correct (if provided)</li>
                  </ul>
                )}
              </div>
            </div>
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
