import { useState, useEffect } from "react";
import { LLM_MODELS } from "../data/dictionaryData";

type CustomModel = {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint?: string;
};

type SettingsPanelProps = {
  // Add any props if needed
};

const SettingsPanel: React.FC<SettingsPanelProps> = () => {
  const [promptTemplate, setPromptTemplate] = useState(() => {
    const saved = localStorage.getItem("promptTemplate");
    return (
      saved ||
      `Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify.`
    );
  });

  const [customModels, setCustomModels] = useState<CustomModel[]>(() => {
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

  // New state for adding custom models
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelApiKey, setNewModelApiKey] = useState("");
  const [newModelApiEndpoint, setNewModelApiEndpoint] = useState("");
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem("promptTemplate", promptTemplate);
  }, [promptTemplate]);

  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem("customModels", JSON.stringify(customModels));
  }, [customModels]);

  useEffect(() => {
    // If no model is selected and we have models available, select the first one
    if (!selectedModel && [...LLM_MODELS, ...customModels].length > 0) {
      setSelectedModel([...LLM_MODELS, ...customModels][0].id);
    }
  }, [selectedModel, customModels]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
  };

  const addNewModel = () => {
    if (!newModelName.trim() || !newModelId.trim() || !newModelApiKey.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    // Check for duplicate IDs
    if (
      [...LLM_MODELS, ...customModels].some((model) => model.id === newModelId)
    ) {
      alert("A model with this ID already exists. Please use a unique ID.");
      return;
    }

    const newModel: CustomModel = {
      id: newModelId,
      name: newModelName,
      apiKey: newModelApiKey,
      apiEndpoint: newModelApiEndpoint.trim() || undefined,
    };

    setCustomModels((prev) => [...prev, newModel]);
    setSelectedModel(newModelId);
    resetNewModelForm();
  };

  const removeModel = (modelId: string) => {
    if (window.confirm("Are you sure you want to remove this model?")) {
      setCustomModels((prev) => prev.filter((model) => model.id !== modelId));

      // If the removed model was selected, reset selection
      if (selectedModel === modelId) {
        const availableModels = [
          ...LLM_MODELS,
          ...customModels.filter((model) => model.id !== modelId),
        ];
        setSelectedModel(
          availableModels.length > 0 ? availableModels[0].id : ""
        );
      }
    }
  };

  const resetNewModelForm = () => {
    setNewModelName("");
    setNewModelId("");
    setNewModelApiKey("");
    setNewModelApiEndpoint("");
    setIsAddingModel(false);
    setTestResult(null);
  };

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

  const testPrompt = () => {
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
    const modelDetails = [...LLM_MODELS, ...customModels].find(
      (m) => m.id === selectedModel
    );

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

  const resetToDefault = () => {
    if (window.confirm("Reset to default prompt template?")) {
      setPromptTemplate(`Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify.`);
    }
  };

  // Gets all available models (built-in + custom)
  const allModels = [...LLM_MODELS, ...customModels];

  // Show model setup if no models are configured yet
  const showModelSetup = allModels.length === 0 || customModels.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Model Configuration
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {showModelSetup
            ? "To get started with Redefine, add at least one AI model with your API key."
            : "Manage your AI models and API connections."}
        </p>

        {!isAddingModel ? (
          <div className="space-y-4">
            {customModels.length > 0 && (
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Your Models
                </h4>
                <div className="space-y-3">
                  {customModels.map((model) => (
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
                      <button
                        onClick={() => removeModel(model.id)}
                        className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsAddingModel(true)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md px-4 py-2 text-sm font-medium transition-colors"
            >
              {customModels.length > 0
                ? "Add Another Model"
                : "Add Your First Model"}
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Add New Model
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Name*
                </label>
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="e.g., Claude 3 Opus"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model ID*
                </label>
                <input
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="e.g., claude-3-opus-20240229"
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API Key*
                </label>
                <input
                  type="password"
                  value={newModelApiKey}
                  onChange={(e) => setNewModelApiKey(e.target.value)}
                  placeholder="Enter your API key"
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
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>

              <div className="pt-1">
                <button
                  onClick={testApiConnection}
                  disabled={testingModel || !newModelApiKey}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed mr-2"
                >
                  {testingModel ? "Testing..." : "Test Connection"}
                </button>

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
                <button
                  onClick={resetNewModelForm}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addNewModel}
                  disabled={!newModelName || !newModelId || !newModelApiKey}
                  className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Model
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {allModels.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Definition Generation Settings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Customize how definitions are generated by editing the prompt
            template and selecting your preferred AI model.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language Model
            </label>
            <select
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <optgroup label="Your Models">
                {customModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
              {LLM_MODELS.length > 0 && (
                <optgroup label="Built-in Models">
                  {LLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prompt Template
              </label>
              <button
                onClick={resetToDefault}
                className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
              >
                Reset to Default
              </button>
            </div>
            <textarea
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
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

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Test Your Prompt
            </h4>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={testWord}
                onChange={(e) => setTestWord(e.target.value)}
                placeholder="Enter a word to test"
                className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              <button
                onClick={testPrompt}
                disabled={isGenerating || !selectedModel}
                className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Test"}
              </button>
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
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Display Settings
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Enable streaming text effect
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggleStreaming"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
                defaultChecked={true}
              />
              <label
                htmlFor="toggleStreaming"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Auto-save flashcards
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="toggleAutoSave"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
              />
              <label
                htmlFor="toggleAutoSave"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Show pronunciation guide
            </label>
            <div className="relative inline-block w-10 mr-2 align-middle select-none">
              <input
                type="checkbox"
                name="toggle"
                id="togglePronunciation"
                className="absolute block w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-4 appearance-none cursor-pointer checked:right-0 checked:border-blue-500 dark:checked:border-blue-400 transition-all duration-200"
                defaultChecked={true}
              />
              <label
                htmlFor="togglePronunciation"
                className="block overflow-hidden h-6 rounded-full bg-gray-300 dark:bg-gray-700 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
          App Information
        </h3>
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
      </div>
    </div>
  );
};

export default SettingsPanel;
