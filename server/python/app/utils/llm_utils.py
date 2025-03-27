import os
import json
from typing import Dict, Any, Optional
import litellm
from app.models.schemas import LLMModel


def set_api_key(model: LLMModel) -> None:
    """Set the API key for a specific model provider."""
    provider = model.id.split("/")[0].lower() if "/" in model.id else model.id.lower()
    env_var_name = f"{provider.upper()}_API_KEY"
    os.environ[env_var_name] = model.apiKey
    if model.apiEndpoint:
        env_var_base = f"{provider.upper()}_API_BASE"
        os.environ[env_var_base] = model.apiEndpoint


def test_prompt(model_info: Dict[str, Any], prompt: str) -> str:
    """
    Test a model with a custom prompt and return the raw text response.

    Args:
        model_info: Dictionary containing model configuration (id, apiKey, etc.)
        prompt: The prompt to send to the model

    Returns:
        str: The raw text response from the model
    """
    # Create LLMModel object from dictionary
    model = LLMModel(
        id=model_info["id"],
        name=model_info["name"],
        apiKey=model_info["apiKey"],
        apiEndpoint=model_info.get("apiEndpoint"),
    )

    set_api_key(model)

    try:
        response = litellm.completion(
            model=model.id,
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        content = response.choices[0].message.content
        return content

    except Exception as e:
        error_msg = f"Error testing model: {str(e)}"
        raise Exception(error_msg)


def generate_definition(
    word: str, model_id: str, api_key: str, api_endpoint: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a definition, examples, and other metadata for a word using the selected model."""

    model = LLMModel(
        id=model_id,
        name=model_id,  # Frontend will provide the actual model ID
        apiKey=api_key,
        apiEndpoint=api_endpoint,
    )
    set_api_key(model)

    # Create the prompt
    system_prompt = """You are a highly knowledgeable dictionary assistant. 
    Your task is to provide comprehensive information about a word, including:
    1. The correct phonetic pronunciation
    2. Part of speech
    3. A rich, detailed definition that explains both literal meaning and cultural/practical context
    4. An example sentence showing proper usage
    5. A list of synonyms
    6. Three flashcards for learning the word (question and answer pairs)

    Format your response as a JSON object with these fields:
    {
        "word": "the word",
        "phonetic": "phonetic pronunciation",
        "partOfSpeech": "part of speech",
        "definition": "detailed definition",
        "example": "example sentence",
        "synonyms": ["synonym1", "synonym2", ...],
        "flashcards": [
            {"front": "question1", "back": "answer1"},
            {"front": "question2", "back": "answer2"},
            {"front": "question3", "back": "answer3"}
        ]
    }
    """

    user_prompt = f"Define the word: {word}"

    # Make the LLM call with error handling
    try:
        response = litellm.completion(
            model=model_id,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )

        # Extract and parse response content
        content = response.choices[0].message.content
        try:
            # Try to parse JSON from the response
            result = json.loads(content)

            # Ensure all required fields are present
            required_fields = ["word", "phonetic", "partOfSpeech", "definition"]
            for field in required_fields:
                if field not in result:
                    result[field] = ""

            # Ensure optional fields have default values if missing
            if "example" not in result:
                result["example"] = ""
            if "synonyms" not in result:
                result["synonyms"] = []
            if "flashcards" not in result:
                result["flashcards"] = []

            return result
        except json.JSONDecodeError:
            # If JSON parsing failed, create a basic response
            return {
                "word": word,
                "phonetic": "",
                "partOfSpeech": "",
                "definition": content,  # Use the raw response as definition
                "example": "",
                "synonyms": [],
                "flashcards": [],
            }
    except Exception as e:
        # Handle any LLM API errors
        return {
            "word": word,
            "error": str(e),
            "phonetic": "",
            "partOfSpeech": "",
            "definition": f"Error generating definition: {str(e)}",
            "example": "",
            "synonyms": [],
            "flashcards": [],
        }
