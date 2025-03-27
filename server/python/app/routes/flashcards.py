from flask import Blueprint, request, jsonify
from app.models.schemas import Flashcard
from app.utils.db_utils import get_flashcards, add_flashcard, delete_flashcard
from datetime import datetime

flashcards_bp = Blueprint("flashcards", __name__)


@flashcards_bp.route("/", methods=["GET"])
def get_all_flashcards():
    """Get all flashcards."""
    return jsonify(get_flashcards())


@flashcards_bp.route("/", methods=["POST"])
def create_flashcard():
    """Create a new flashcard."""
    data = request.json

    # Validate required fields
    required_fields = ["front", "back", "word"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    # Create flashcard with current timestamp
    flashcard = Flashcard(
        front=data["front"],
        back=data["back"],
        word=data["word"],
        exportedAt=datetime.now().isoformat(),
    )

    # Add to database
    result = add_flashcard(flashcard)

    return jsonify(result), 201


@flashcards_bp.route("/", methods=["DELETE"])
def remove_flashcard():
    """Delete a flashcard."""
    data = request.json

    # Validate required fields
    required_fields = ["front", "back", "word"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    # Delete from database
    success = delete_flashcard(data["word"], data["front"], data["back"])

    if success:
        return jsonify({"message": "Flashcard deleted successfully"}), 200
    else:
        return jsonify({"error": "Flashcard not found"}), 404


@flashcards_bp.route("/export", methods=["POST"])
def export_flashcards():
    """Export flashcards to various formats."""
    data = request.json

    if "flashcards" not in data or not isinstance(data["flashcards"], list):
        return jsonify({"error": "Invalid flashcards data"}), 400

    format_type = data.get("format", "anki")

    # Sanitize the flashcards data
    flashcards = []
    saved_flashcards = []
    for card in data["flashcards"]:
        flashcards.append(card)

        # Create a Flashcard object and save to database
        if "word" in card:
            word = card["word"]
            front = card["front"]
            back = card["back"]

            # Create flashcard with current timestamp if exportedAt is not provided
            export_time = card.get("exportedAt", datetime.now().isoformat())

            flashcard = Flashcard(
                front=front, back=back, word=word, exportedAt=export_time
            )

            # Add to database and collect results
            result = add_flashcard(flashcard)
            if result:
                saved_flashcards.append(result)

    if format_type == "anki":
        # Create Anki-compatible format
        # In a real app, this would generate an Anki package
        anki_data = {
            "notes": [
                {"front": card["front"], "back": card["back"], "tags": [card["word"]]}
                for card in flashcards
            ],
            "saved_flashcards": saved_flashcards,
        }
        return jsonify(anki_data)

    elif format_type == "csv":
        # Create CSV format (just the data structure, not the actual file)
        csv_data = {
            "headers": ["front", "back", "word"],
            "rows": [
                [card["front"], card["back"], card["word"]] for card in flashcards
            ],
            "saved_flashcards": saved_flashcards,
        }
        return jsonify(csv_data)

    else:
        return jsonify({"error": f"Unsupported format: {format_type}"}), 400
