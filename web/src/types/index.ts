export type ExplanationEntry = {
  query: string;
  type: string;
  explanation: string;
  pronunciation: string;
  related_items?: string[];
  quotes?: string[];
  flashcards?: {type: string; front: string; back: string }[];
};

export type Flashcard = {
  type: string;
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