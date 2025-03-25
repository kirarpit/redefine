-- Table for storing flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    exported_at TEXT NOT NULL
);

-- Table for storing LLM models
CREATE TABLE IF NOT EXISTS llm_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_endpoint TEXT
); 