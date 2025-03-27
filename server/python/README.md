# Redefine Python Backend

This is the Python backend for the Redefine app, an application that uses LLMs to generate detailed explanations and learning aids for various queries.

## Features

- Query lookup API
- Autosuggest for queries as users type
- LLM integration using LiteLLM for generating explanations for unknown queries
- Flashcard management API
- Support for multiple LLM providers (OpenAI, Anthropic, etc.)

## Setup

1. Create a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

4. Edit the `.env` file with your configuration.

## Running the Server

To run the development server:

```bash
python app.py
```

For production, use gunicorn:

```bash
gunicorn app:app
```

## API Endpoints

### Explanation API

- `GET /api/explain/search?q=<query>` - Search for an explanation
- `GET /api/explain/autosuggest?q=<prefix>` - Get suggestions for a query prefix

### Flashcard API

- `GET /api/flashcards/` - Get all flashcards
- `POST /api/flashcards/` - Create a new flashcard
- `DELETE /api/flashcards/` - Delete a flashcard
- `POST /api/flashcards/export` - Export flashcards to different formats

### LLM API

- `GET /api/llm/models` - Get all available LLM models
- `POST /api/llm/models` - Add a new LLM model configuration
- `DELETE /api/llm/models/<model_id>` - Delete an LLM model configuration
- `POST /api/llm/models/test` - Test an LLM model connection

## Database

The application can work with or without PostgreSQL:

- If `DATABASE_URL` is provided in the environment, the app will use PostgreSQL for persistence
- Otherwise, it will use in-memory storage (data will be lost on server restart)

The PostgreSQL connection string format is:

```
postgresql://username:password@hostname:port/database
```

When the application starts with a valid database connection, it will automatically create the necessary tables if they don't exist.

## Adding Custom LLM Models

Custom LLM models can be added through the API or via the frontend UI. The backend uses LiteLLM to abstract away differences between LLM providers.
