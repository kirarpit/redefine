import os
import yaml
from typing import Dict, Any, Optional
import litellm
from app.models.schemas import LLMModel
from app.utils import db_utils
import logging


def set_api_key(model: LLMModel) -> None:
    """Set the API key for a specific model provider."""
    provider = model.id.split("/")[0].lower() if "/" in model.id else model.id.lower()
    env_var_name = f"{provider.upper()}_API_KEY"
    os.environ[env_var_name] = model.apiKey
    if model.apiEndpoint:
        env_var_base = f"{provider.upper()}_API_BASE"
        os.environ[env_var_base] = model.apiEndpoint


def test_prompt(model: LLMModel, prompt: str) -> str:
    """
    Test a model with a custom prompt and return the raw text response.

    Args:
        model: The model to use
        prompt: The prompt to send to the model

    Returns:
        str: The raw text response from the model
    """
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


def get_model_by_id(model_id: str) -> Optional[LLMModel]:
    """Get a model by ID from the database."""
    models = db_utils.get_llm_models()
    for model in models:
        if model["id"] == model_id:
            return LLMModel(**model)
    return None


def generate_explanation(query: str, model_id: str) -> Dict[str, Any]:
    """Generate an explanation for a given query using the selected model."""
    model = get_model_by_id(model_id)
    if not model:
        raise Exception(f"Model with ID {model_id} not found")
    set_api_key(model)

    prompt_template = db_utils.get_prompt_template()
    if not prompt_template:
        raise Exception("No prompt template found")
    prompt = prompt_template.format(query=query)
    try:
        response = litellm.completion(
            model=model.id,
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,
        )

        content = response.choices[0].message.content
        print(content)
        content = content.split("```yaml", 1)[1].split("```", 1)[0].strip()
        result = yaml.safe_load(content)
        print(result)
        required_fields = [
            "query",
            "type",
            "explanation",
            "pronunciation",
            "related_items",
            "quotes",
            "flashcards",
        ]
        for field in required_fields:
            if field not in result:
                if field in ["related_items", "quotes", "flashcards"]:
                    result[field] = []
                else:
                    result[field] = None
        return result
    except Exception as e:
        logging.error(f"LLM call error: {str(e)}")
        return {
            "query": query,
            "type": "",
            "explanation": f"Error generating explanation: {str(e)}",
            "pronunciation": None,
            "related_items": [],
            "quotes": [],
            "flashcards": [],
            "error": str(e),
        }


# if __name__ == "__main__":
#     model = get_model_by_id("gemini/gemini-2.0-flash")
#     print(generate_explanation("what is masochims", model.id))
