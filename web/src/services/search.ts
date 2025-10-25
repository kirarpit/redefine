import { API_BASE_URL } from "../config";
import { ExplanationEntry } from "../types";

export const searchExplanation = async (
  query: string,
  modelId: string,
  promptType: string = "general"
): Promise<ExplanationEntry> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/explain/search?q=${encodeURIComponent(
        query
      )}&modelId=${encodeURIComponent(
        modelId
      )}&promptType=${encodeURIComponent(promptType)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    const data = await response.json();
    return data.entry;
  } catch (error) {
    console.error("Error searching for explanation:", error);
    throw error;
  }
};

export const fetchSuggestions = async (query: string): Promise<string[]> => {
  if (!query.trim() || query.trim().length <= 1) {
    return [];
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/explain/autosuggest?q=${encodeURIComponent(
        query.trim()
      )}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};
