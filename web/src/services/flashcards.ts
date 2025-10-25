import { API_BASE_URL } from "../config";
import { Flashcard } from "../types";

export type FlashcardIdentifier = {
  front: string;
  back: string;
  query: string;
};

export type FlashcardExportPayload = {
  flashcards: Array<FlashcardIdentifier & { exportedAt: string }>;
  format: string;
};

export type FlashcardExportResponse = {
  saved_flashcards?: Flashcard[];
  [key: string]: unknown;
};

export const exportFlashcards = async (
  payload: FlashcardExportPayload
): Promise<FlashcardExportResponse> => {
  const response = await fetch(`${API_BASE_URL}/flashcards/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorMsg = `HTTP error: ${response.status}`;
    throw new Error(errorMsg);
  }

  return response.json();
};

export const deleteFlashcard = async (
  identifier: FlashcardIdentifier
): Promise<boolean> => {
  const response = await fetch(`${API_BASE_URL}/flashcards/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(identifier),
  });

  if (!response.ok) {
    return false;
  }

  return true;
};

export const fetchFlashcards = async (): Promise<Flashcard[]> => {
  const response = await fetch(`${API_BASE_URL}/flashcards/`);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json();
};
