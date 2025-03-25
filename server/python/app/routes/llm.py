from flask import Blueprint, request, jsonify
from app.models.schemas import LLMModel
from app.utils.db_utils import get_llm_models, add_llm_model, delete_llm_model
from app.utils.sanitize_utils import sanitize_input

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


@llm_bp.route("/models/<model_id>", methods=["DELETE"])
def remove_model(model_id):
    """Delete an LLM model."""
    if not model_id:
        return jsonify({"error": "Model ID is required"}), 400

    success = delete_llm_model(sanitize_input(model_id))

    if success:
        return jsonify({"message": "Model deleted successfully"}), 200
    else:
        return jsonify({"error": "Model not found"}), 404
