from flask import Blueprint, request, jsonify
from app.utils.db_utils import get_prompt_template, save_prompt_template

settings_bp = Blueprint("settings", __name__)


# Default prompt template to use if none exists in the database
DEFAULT_PROMPT_TEMPLATE = """Provide a comprehensive definition for the word "{word}" that includes:
1. Its meaning in plain, accessible language
2. Contextual examples of how it's used
3. Cultural or historical significance if relevant
4. Common phrases or idioms it appears in
5. Connections to related concepts

Keep the tone conversational but informative, as if explaining to a curious friend. Avoid overly academic language but don't oversimplify."""


@settings_bp.route("/prompt-template", methods=["GET"])
def get_template():
    """
    Get the prompt template.

    Query Parameters:
        default (bool): If set to 'true', returns the default template regardless of what's in the database.
    """
    use_default = request.args.get("default", "").lower() == "true"

    if use_default:
        template = DEFAULT_PROMPT_TEMPLATE
    else:
        template = get_prompt_template()
        if template is None:
            template = DEFAULT_PROMPT_TEMPLATE
            save_prompt_template(template)

    return jsonify({"template": template}), 200


@settings_bp.route("/prompt-template", methods=["POST"])
def save_template():
    """Save a new prompt template."""
    data = request.json

    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid request body"}), 400

    if "template" not in data:
        return jsonify({"error": "Missing required field: template"}), 400

    if not data["template"] or not isinstance(data["template"], str):
        return jsonify({"error": "Invalid value for field: template"}), 400

    # Save the template to the database
    success = save_prompt_template(data["template"])

    if success:
        return jsonify({"message": "Prompt template saved successfully"}), 200
    else:
        return jsonify({"error": "Failed to save prompt template"}), 500
