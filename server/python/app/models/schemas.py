from pydantic import BaseModel
from typing import List, Optional


class FlashcardItem(BaseModel):
    front: str
    back: str


class ExplanationEntry(BaseModel):
    query: str
    type: str
    explanation: str
    pronunciation: str
    related_items: Optional[List[str]] = None
    quotes: Optional[List[str]] = None
    flashcards: Optional[List[FlashcardItem]] = None


class Flashcard(BaseModel):
    front: str
    back: str
    query: str
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
    entry: ExplanationEntry


class ErrorResponse(BaseModel):
    error: str
