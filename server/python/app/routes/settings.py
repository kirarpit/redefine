from flask import Blueprint, request, jsonify
from app.utils import db_utils
from app.utils import settings_utils

settings_bp = Blueprint("settings", __name__)


@settings_bp.route("/prompt-template", methods=["GET"])
def get_template():
    """
    Get the prompt template.

    Query Parameters:
        default (bool): If set to 'true', returns the default template regardless of what's in the database.
    """
    use_default = request.args.get("default", "").lower() == "true"
    default_template = settings_utils.load_prompt_template()

    if use_default:
        template = default_template
    else:
        template = db_utils.get_prompt_template()
        if template is None:
            template = default_template
            db_utils.save_prompt_template(template)

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
    success = db_utils.save_prompt_template(data["template"])

    if success:
        return jsonify({"message": "Prompt template saved successfully"}), 200
    else:
        return jsonify({"error": "Failed to save prompt template"}), 500
