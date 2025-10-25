import { API_BASE_URL } from "../config";

export type PromptType = "general" | "anki";

export const savePromptTemplate = async (
  template: string,
  type: PromptType = "general"
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/settings/prompt-template`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ template, type }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! Status: ${response.status}`
      );
    }

    return true;
  } catch (error) {
    console.error(`Error saving ${type} prompt template:`, error);
    throw error;
  }
};

export const fetchPromptTemplate = async (
  type: PromptType = "general",
  getDefault: boolean = false
): Promise<string | null> => {
  try {
    let url = `${API_BASE_URL}/settings/prompt-template?type=${type}`;
    if (getDefault) {
      url += "&default=true";
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data.template;
  } catch (error) {
    console.error(`Error fetching ${type} prompt template:`, error);
    return null;
  }
};
