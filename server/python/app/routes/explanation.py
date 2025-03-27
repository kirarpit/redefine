from flask import Blueprint, request, jsonify
from app.data.sample_explanations import explanation_data
from app.utils.llm_utils import generate_explanation
import logging

explanation_bp = Blueprint("explain", __name__)


@explanation_bp.route("/search", methods=["GET"])
def search():
    """Search for an explanation of a query."""
    query = request.args.get("q", "").lower()
    if not query:
        return jsonify({"error": "No search query provided"}), 400
    model_id = request.args.get("modelId")
    if not model_id:
        return jsonify({"error": "LLM model ID is required"}), 400
    try:
        explanation = generate_explanation(query, model_id)
        return jsonify({"entry": explanation})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@explanation_bp.route("/autosuggest", methods=["GET"])
def autosuggest():
    """
    Provide autosuggest results for a partial query.

    Parameters:
    - q: The partial query to get suggestions for

    Returns:
    - A list of suggested queries
    """
    prefix = request.args.get("q", "").lower()
    if not prefix:
        return jsonify([])

    # Filter explanation queries that start with the prefix
    suggestions = [
        query for query in explanation_data.keys() if query.startswith(prefix)
    ]
    return jsonify(suggestions[:10])  # Limit to 10 suggestions
