from flask import Blueprint, request, jsonify
from app.models.schemas import LLMModel
from app.utils.db_utils import get_llm_models, add_llm_model, delete_llm_model
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

    model = LLMModel(
        id=data["modelId"],
        name=data["name"],
        apiKey=data["apiKey"],
        apiEndpoint=data.get("apiEndpoint", None),
    )
    add_llm_model(model)
    return jsonify({"message": "Model added successfully"}), 201


@llm_bp.route("/models/<path:model_id>", methods=["DELETE"])
def remove_model(model_id):
    if not model_id:
        return jsonify({"error": "Model ID is required"}), 400

    decoded_model_id = urllib.parse.unquote(model_id)
    success = delete_llm_model(decoded_model_id)

    if success:
        return jsonify({"message": "Model deleted successfully"}), 200
    else:
        return jsonify({"error": "Model not found"}), 404


@llm_bp.route("/test", methods=["POST"])
def test_model():
    """Test an LLM model with a prompt."""
    data = request.json

    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    required_fields = ["modelId", "prompt"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400
        if not data[field] or not isinstance(data[field], str):
            return jsonify({"error": f"Invalid value for field: {field}"}), 400

    prompt = data["prompt"]

    try:
        models = get_llm_models()
        model = next((m for m in models if m["id"] == data["modelId"]), None)

        if not model:
            return jsonify({"error": "Model not found"}), 404

        response = test_prompt(model, prompt)

        return jsonify({"response": response}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to generate response: {str(e)}"}), 500
