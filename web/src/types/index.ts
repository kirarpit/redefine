export type DictionaryEntry = {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  flashcards?: { front: string; back: string }[];
};

export type Flashcard = {
  front: string;
  back: string;
  word: string;
  savedAt: string;
};

export type SearchHistoryItem = {
  word: string;
  timestamp: string;
};

export type LLMModel = {
  id: string;
  name: string;
  apiKey: string;
  apiEndpoint?: string;
}; 