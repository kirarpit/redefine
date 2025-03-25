from flask import Blueprint, request, jsonify
from app.data.sample_dictionary import dictionary_data
from app.utils.llm_utils import generate_definition
from app.utils.sanitize_utils import sanitize_input

dictionary_bp = Blueprint("dictionary", __name__)


@dictionary_bp.route("/search", methods=["GET"])
def search():
    """Search for a word definition."""
    word = sanitize_input(request.args.get("q", "").lower())

    if not word:
        return jsonify({"error": "No search query provided"}), 400

    model_id = sanitize_input(request.args.get("modelId"))
    api_key = sanitize_input(request.args.get("apiKey"))
    api_endpoint = sanitize_input(request.args.get("apiEndpoint"))

    if not model_id or not api_key:
        return (
            jsonify({"error": "LLM model ID and API key are required"}),
            400,
        )

    # Generate definition using LLM
    try:
        definition = generate_definition(word, model_id, api_key, api_endpoint)
        return jsonify({"entry": definition})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dictionary_bp.route("/autosuggest", methods=["GET"])
def autosuggest():
    """Get autosuggest results for a partial word."""
    prefix = sanitize_input(request.args.get("q", "").lower())

    if not prefix:
        return jsonify({"suggestions": []})

    # Filter dictionary words that start with the prefix
    suggestions = [word for word in dictionary_data.keys() if word.startswith(prefix)]

    # Limit to 10 suggestions
    suggestions = suggestions[:10]

    return jsonify({"suggestions": suggestions})
