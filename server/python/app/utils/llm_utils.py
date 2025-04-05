import os
import yaml
from typing import Dict, Any, Optional
import litellm
from litellm.caching import Cache
from app.models.schemas import LLMModel
from app.utils import db_utils
import logging

custom_cache = {}


def set_api_key(model: LLMModel) -> None:
    """Set the API key for a specific model provider."""
    provider = model.id.split("/")[0].lower() if "/" in model.id else model.id.lower()
    env_var_name = f"{provider.upper()}_API_KEY"
    os.environ[env_var_name] = model.apiKey
    if model.apiEndpoint:
        env_var_base = f"{provider.upper()}_API_BASE"
        os.environ[env_var_base] = model.apiEndpoint


def call_llm(model: LLMModel, prompt: str) -> str:
    set_api_key(model)

    try:
        response = litellm.completion(
            model=model.id,
            messages=[
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            caching=False,
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


def call_llm_and_parse_yaml(model: LLMModel, prompt: str) -> Dict[str, Any]:
    """Call LLM with a prompt and parse the YAML response."""
    try:
        content = call_llm(model, prompt)

        try:
            yaml_content = content.split("```yaml", 1)[1].split("```", 1)[0].strip()
            result = yaml.safe_load(yaml_content)

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

            return {"success": True, "content": content, "parsed_result": result}

        except (IndexError, yaml.YAMLError) as yaml_error:
            logging.error(f"YAML parsing error: {str(yaml_error)}")
            return {
                "success": False,
                "content": content,
                "error": f"Error parsing response: {str(yaml_error)}",
            }

    except Exception as e:
        logging.error(f"LLM call error: {str(e)}")
        return {
            "success": False,
            "content": None,
            "error": f"Error calling LLM: {str(e)}",
        }


def generate_explanation(query: str, model_id: str) -> Dict[str, Any]:
    """Generate an explanation for a given query using the selected model."""
    model = get_model_by_id(model_id)
    if not model:
        raise Exception(f"Model with ID {model_id} not found")

    prompt_template = db_utils.get_prompt_template()
    if not prompt_template:
        raise Exception("No prompt template found")
    prompt = prompt_template.format(query=query)

    cache_key = f"{model_id}:{prompt}"
    if cache_key in custom_cache:
        logging.info(f"Using cached result for query: {query}")
        return custom_cache[cache_key]

    result = call_llm_and_parse_yaml(model, prompt)

    if result["success"]:
        parsed_result = result["parsed_result"]
        print(parsed_result)
        custom_cache[cache_key] = parsed_result
        return parsed_result
    else:
        return {
            "query": query,
            "type": "",
            "explanation": result.get("error", "Unknown error"),
            "pronunciation": None,
            "related_items": [],
            "quotes": [],
            "flashcards": [],
            "error": result.get("error", "Unknown error"),
        }


def test_prompt(model: LLMModel, prompt: str) -> str:
    """Test a model with a custom prompt and return the raw text response."""
    result = call_llm_and_parse_yaml(model, prompt)

    # Return the raw text response
    if not result["success"]:
        return f"ERROR: {result['error']}\n\nRaw response (if available):\n{result.get('content', 'No response')}"

    return result["content"]
