import { useState, FC } from "react";
import { LLMModel } from "../types";
import { Card, Button } from "./UIComponents";
import { testModel } from "../services/models";
import {
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "./icons";

export const RECOMMENDED_MODEL_ID = "gemini/gemini-2.0-flash";

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
              <CheckIcon className="w-4 h-4 mr-0.5" />
              Active
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
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
  models?: LLMModel[];
};

export const AddModelForm: FC<AddModelFormProps> = ({
  onAdd,
  onCancel,
  models = [],
}) => {
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelApiKey, setNewModelApiKey] = useState("");
  const [newModelApiEndpoint, setNewModelApiEndpoint] = useState("");
  const [testingModel, setTestingModel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [modelIdError, setModelIdError] = useState("");
  const [showRecommendation, setShowRecommendation] = useState(true);

  const isRecommendedModelAdded = models.some(
    (model) => model.id === RECOMMENDED_MODEL_ID
  );

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
      const tempModelId = newModelId.trim();
      const testPrompt = "hello world";

      await testModel(
        tempModelId,
        testPrompt,
        newModelApiKey.trim(),
        newModelApiEndpoint.trim(),
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

  const handleTestButtonClick = () => {
    testApiConnection(true);
  };

  const validateModelId = (id: string) => {
    if (!id.includes("/")) {
      setModelIdError(
        `Model ID must include provider (e.g., ${RECOMMENDED_MODEL_ID})`
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
    if (submitting) return;

    setSubmitting(true);

    try {
      if (!newModelId.trim() || !newModelApiKey.trim()) {
        alert("Please fill in all required fields");
        return;
      }

      if (!validateModelId(newModelId)) {
        return;
      }

      setTestingModel(true);
      const testSuccess = await testApiConnection(true);

      if (!testSuccess) {
        return;
      }

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
        id: newModelId.trim(),
        name: modelName,
        apiKey: newModelApiKey.trim(),
        apiEndpoint: newModelApiEndpoint.trim() || undefined,
      };

      onAdd(newModel);
    } finally {
      setSubmitting(false);
    }
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
            placeholder={`e.g., ${RECOMMENDED_MODEL_ID}`}
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
        </div>

        {showRecommendation && !isRecommendedModelAdded && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 relative">
            <button
              onClick={() => setShowRecommendation(false)}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close recommendation"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
            <div className="flex items-start">
              <InformationCircleIcon className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Recommended Model
                </h4>
                <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">
                  We recommend{" "}
                  <span className="font-mono font-medium">
                    {RECOMMENDED_MODEL_ID}
                  </span>{" "}
                  - this model provides a good balance of speed and quality.
                </p>
                <div className="mt-2 flex items-center">
                  <button
                    onClick={() => {
                      setNewModelId(RECOMMENDED_MODEL_ID);
                      validateModelId(RECOMMENDED_MODEL_ID);
                    }}
                    className="text-xs bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 text-blue-700 dark:text-blue-300 font-medium py-1 px-2 rounded-md mr-2"
                  >
                    Use Recommended Model
                  </button>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    Get free API key
                    <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-1" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <CheckIcon className="w-5 h-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400 mr-2 flex-shrink-0 mt-0.5" />
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
          <Button
            onClick={onCancel}
            variant="secondary"
            disabled={submitting || testingModel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddModel}
            disabled={
              !newModelId || !newModelApiKey || submitting || testingModel
            }
          >
            {submitting ? "Adding..." : "Add Model"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
