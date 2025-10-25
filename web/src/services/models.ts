import { API_BASE_URL } from "../config";
import { LLMModel } from "../types";

export const fetchModels = async (): Promise<LLMModel[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/llm/models`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.models || [];
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
  skipLookup: boolean = false
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
          modelId: modelId.trim(),
          prompt: prompt.trim(),
          apiKey: apiKey?.trim(),
          apiEndpoint: apiEndpoint?.trim(),
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

export const getSelectedModelId = (): string | null => {
  return localStorage.getItem("selectedModel");
};
