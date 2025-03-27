from flask import Blueprint, request, jsonify
from app.data.sample_dictionary import dictionary_data
from app.utils.llm_utils import generate_definition

dictionary_bp = Blueprint("dictionary", __name__)


@dictionary_bp.route("/search", methods=["GET"])
def search():
    """Search for a word definition."""
    word = request.args.get("q", "").lower()
    if not word:
        return jsonify({"error": "No search query provided"}), 400
    model_id = request.args.get("modelId")
    if not model_id:
        return jsonify({"error": "LLM model ID is required"}), 400
    try:
        definition = generate_definition(word, model_id)
        return jsonify({"entry": definition})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dictionary_bp.route("/autosuggest", methods=["GET"])
def autosuggest():
    """Get autosuggest results for a partial word."""
    prefix = request.args.get("q", "").lower()

    if not prefix:
        return jsonify({"suggestions": []})

    # Filter dictionary words that start with the prefix
    suggestions = [word for word in dictionary_data.keys() if word.startswith(prefix)]

    # Limit to 10 suggestions
    suggestions = suggestions[:10]

    return jsonify({"suggestions": suggestions})
