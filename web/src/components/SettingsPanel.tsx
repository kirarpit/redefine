import { useState, useEffect, FC, ReactNode } from "react";
import { LLMModel } from "../types";

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

const InputField: FC<InputFieldProps> = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
      {required && "*"}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
    />
  </div>
);

type ButtonProps = {
  onClick: () => void;
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
};

const ModelList: FC<ModelListProps> = ({ models, onRemove }) => (
  <div className="space-y-3">
    {models.map((model) => (
      <div
        key={model.id}
        className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
      >
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {model.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            API Key: ••••••••{model.apiKey.slice(-4)}
          </p>
        </div>
        <Button onClick={() => onRemove(model.id)} variant="danger">
          Remove
        </Button>
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

  const handleAddModel = () => {
    if (!newModelId.trim() || !newModelApiKey.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    const newModel: LLMModel = {
      id: newModelId,
      name: newModelName.trim() || newModelId,
      apiKey: newModelApiKey,
      apiEndpoint: newModelApiEndpoint.trim() || undefined,
    };

    onAdd(newModel);
  };

  return (
    <Card title="Add New Model">
      <div className="space-y-3">
        <InputField
          label="Model Name"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          placeholder="e.g., Claude 3 Opus (optional)"
          required={false}
        />

        <InputField
          label="Model ID"
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
          placeholder="e.g., claude-3-opus-20240229"
          required
        />

        <InputField
          label="API Key"
          type="password"
          value={newModelApiKey}
          onChange={(e) => setNewModelApiKey(e.target.value)}
          placeholder="Enter your API key"
          required
        />

        <InputField
          label="API Endpoint (Optional)"
          value={newModelApiEndpoint}
          onChange={(e) => setNewModelApiEndpoint(e.target.value)}
          placeholder="https://api.example.com/v1/chat/completions"
        />

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
};

const PromptTemplateEditor: FC<PromptTemplateEditorProps> = ({
  promptTemplate,
  onPromptChange,
  onResetToDefault,
}) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Prompt Template
      </label>
      <button
        onClick={onResetToDefault}
        className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
      >
        Reset to Default
      </button>
    </div>
    <textarea
      value={promptTemplate}
      onChange={(e) => onPromptChange(e.target.value)}
      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 h-40"
      placeholder="Enter your prompt template here. Use {word} as a placeholder for the searched word."
    />
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
      Use{" "}
      <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-blue-500 dark:text-blue-400">
        {"{word}"}
      </code>{" "}
      as a placeholder for the search term.
    </p>
  </div>
);

type TestPromptSectionProps = {
  testWord: string;
  onTestWordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTest: () => void;
  isGenerating: boolean;
  generatedDefinition: string;
  selectedModel: string;
};

const TestPromptSection: FC<TestPromptSectionProps> = ({
  testWord,
  onTestWordChange,
  onTest,
  isGenerating,
  generatedDefinition,
  selectedModel,
}) => (
  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
      Test Your Prompt
    </h4>

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
  const [promptTemplate, setPromptTemplate] = useState(() => {
    const saved = localStorage.getItem("promptTemplate");
    return saved || DEFAULT_PROMPT_TEMPLATE;
  });

  const [models, setModels] = useState<LLMModel[]>(() => {
    const saved = localStorage.getItem("customModels");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("selectedModel");
    return saved || "";
  });

  const [testWord, setTestWord] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDefinition, setGeneratedDefinition] = useState("");
  const [isAddingModel, setIsAddingModel] = useState(false);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem("promptTemplate", promptTemplate);
  }, [promptTemplate]);

  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("customModels", JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    // If no model is selected and we have models available, select the first one
    if (!selectedModel && models.length > 0) {
      setSelectedModel(models[0].id);
    }
  }, [selectedModel, models]);

  // Event handlers
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  const handleAddModel = (newModel: LLMModel) => {
    // Check for duplicate IDs
    if (models.some((model) => model.id === newModel.id)) {
      alert("A model with this ID already exists. Please use a unique ID.");
      return;
    }

    setModels((prev) => [...prev, newModel]);
    setSelectedModel(newModel.id);
    setIsAddingModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    if (window.confirm("Are you sure you want to remove this model?")) {
      setModels((prev) => prev.filter((model) => model.id !== modelId));

      // If the removed model was selected, reset selection
      if (selectedModel === modelId) {
        const availableModels = models.filter((model) => model.id !== modelId);
        setSelectedModel(
          availableModels.length > 0 ? availableModels[0].id : ""
        );
      }
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm("Reset to default prompt template?")) {
      setPromptTemplate(DEFAULT_PROMPT_TEMPLATE);
    }
  };

  const handleTestPrompt = () => {
    if (!testWord.trim()) {
      alert("Please enter a word to test");
      return;
    }

    if (!selectedModel) {
      alert("Please select or add a model first");
      return;
    }

    setIsGenerating(true);
    const finalPrompt = promptTemplate.replace("{word}", testWord);
    const modelDetails = models.find((m) => m.id === selectedModel);

    // Simulate API call with streaming response
    let generatedText =
      "An apple is a common round fruit with a red, green, or yellow skin and crisp, juicy flesh. Beyond being a healthy snack, apples are deeply embedded in our culture - from the 'apple of my eye' idiom describing someone precious to you, to the iconic Apple technology company, to the legendary story of Newton discovering gravity when an apple fell on his head. Apples symbolize knowledge, temptation, and simplicity in various contexts.\n\nPeople eat apples raw, baked into pies, pressed into cider, or cooked into sauce. The phrase 'an apple a day keeps the doctor away' highlights its reputation for healthfulness. In literature and mythology, apples appear in stories from Snow White to the Garden of Eden.\n\nThe versatility of apples extends to phrases like 'apple of discord' (something causing trouble), 'comparing apples and oranges' (comparing unlike things), and 'upsetting the apple cart' (disturbing established order).";

    if (testWord.toLowerCase() !== "apple") {
      generatedText =
        "Generating definition for '" +
        testWord +
        "' using " +
        (modelDetails?.name || selectedModel) +
        "...\n\nThis would typically call an actual LLM API with your custom prompt template, but we're showing a simulation for demonstration purposes.\n\nYour prompt template would be applied to the word '" +
        testWord +
        "' and sent to the selected model for processing.";
    }

    setGeneratedDefinition("");
    let index = 0;
    const interval = setInterval(() => {
      if (index < generatedText.length) {
        setGeneratedDefinition((prev) => prev + generatedText.charAt(index));
        index++;
      } else {
        clearInterval(interval);
        setIsGenerating(false);
      }
    }, 10);
  };

  return (
    <div className="space-y-6">
      <Section
        title="Model Configuration"
        description={
          models.length === 0
            ? "To get started with Redefine, add at least one AI model with your API key."
            : "Manage your AI models and API connections."
        }
      >
        {!isAddingModel ? (
          <div className="space-y-4">
            {models.length > 0 && (
              <Card title="Your Models">
                <ModelList models={models} onRemove={handleRemoveModel} />
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
          description="Customize how definitions are generated by editing the prompt template and selecting your preferred AI model."
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language Model
            </label>
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <PromptTemplateEditor
            promptTemplate={promptTemplate}
            onPromptChange={setPromptTemplate}
            onResetToDefault={handleResetToDefault}
          />

          <TestPromptSection
            testWord={testWord}
            onTestWordChange={(e) => setTestWord(e.target.value)}
            onTest={handleTestPrompt}
            isGenerating={isGenerating}
            generatedDefinition={generatedDefinition}
            selectedModel={selectedModel}
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
