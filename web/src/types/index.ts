export type ExplanationEntry = {
  query: string;
  pronunciation: string;
  type: string;
  explanation: string;
  quotes?: string[];
  synonyms?: string[];
  flashcards?: { front: string; back: string }[];
};

export type Flashcard = {
  front: string;
  back: string;
  query: string;
  exportedAt: string;
};

export type SearchHistoryItem = {
  query: string;
  timestamp: string;
};

export type LLMModel = {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint?: string;
}; 