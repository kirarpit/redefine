from pydantic import BaseModel
from typing import List, Optional


class FlashcardItem(BaseModel):
    front: str
    back: str


class DictionaryEntry(BaseModel):
    word: str
    phonetic: str
    partOfSpeech: str
    definition: str
    example: Optional[str] = None
    synonyms: Optional[List[str]] = None
    flashcards: Optional[List[FlashcardItem]] = None


class Flashcard(BaseModel):
    front: str
    back: str
    word: str
    exportedAt: str


class LLMModel(BaseModel):
    id: str
    name: str
    apiKey: str
    apiEndpoint: Optional[str] = None


class PromptTemplate(BaseModel):
    template: str


class AutosuggestResponse(BaseModel):
    suggestions: List[str]


class SearchResponse(BaseModel):
    entry: DictionaryEntry


class ErrorResponse(BaseModel):
    error: str
