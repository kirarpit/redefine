from flask import Blueprint, request, jsonify
from app.models.schemas import LLMModel
from app.utils.db_utils import get_llm_models, add_llm_model, delete_llm_model
from app.utils.sanitize_utils import sanitize_input
from app.utils.llm_utils import test_prompt
import urllib.parse

llm_bp = Blueprint("llm", __name__)


@llm_bp.route("/models", methods=["GET"])
def get_models():
    """Get all available LLM models."""
    # Return both default models and custom models
    models = get_llm_models()
    return jsonify({"models": models})


@llm_bp.route("/models", methods=["POST"])
def create_model():
    """Add a new LLM model."""
    data = request.json
    print(data)

    # Validate required fields
    required_fields = ["name", "modelId", "apiKey"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
        if not data[field] or not isinstance(data[field], str):
            return jsonify({"error": f"Invalid value for field: {field}"}), 400

    # Sanitize input strings
    name = sanitize_input(data["name"])
    api_key = sanitize_input(data["apiKey"])
    api_endpoint = sanitize_input(data.get("apiEndpoint", ""))
    model_id = sanitize_input(data["modelId"])

    model = LLMModel(
        id=model_id,
        name=name,
        apiKey=api_key,
        apiEndpoint=api_endpoint if api_endpoint else None,
    )
    add_llm_model(model)
    return jsonify({"message": "Model added successfully"}), 201


@llm_bp.route("/models/<path:model_id>", methods=["DELETE"])
def remove_model(model_id):
    if not model_id:
        return jsonify({"error": "Model ID is required"}), 400

    decoded_model_id = urllib.parse.unquote(model_id)

    success = delete_llm_model(sanitize_input(decoded_model_id))

    if success:
        return jsonify({"message": "Model deleted successfully"}), 200
    else:
        return jsonify({"error": "Model not found"}), 404


@llm_bp.route("/test", methods=["POST"])
def test_model():
    """Test an LLM model with a prompt."""
    data = request.json

    # Validate required fields
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    required_fields = ["modelId", "prompt"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
        if not data[field] or not isinstance(data[field], str):
            return jsonify({"error": f"Invalid value for field: {field}"}), 400

    # Sanitize input strings
    model_id = sanitize_input(data["modelId"])
    prompt = sanitize_input(data["prompt"])

    try:
        # Get the model configuration
        models = get_llm_models()
        model = next((m for m in models if m["id"] == model_id), None)

        if not model:
            return jsonify({"error": "Model not found"}), 404

        # Generate response using the test_prompt function from llm_utils
        response = test_prompt(model, prompt)

        return jsonify({"response": response}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500
