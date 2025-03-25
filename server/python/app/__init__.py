from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)
    CORS(app)

    @app.route("/")
    def home():
        return jsonify(
            {
                "status": "ok",
                "message": "Redefine API server is running",
                "endpoints": [
                    "/api/dictionary/search",
                    "/api/dictionary/autosuggest",
                    "/api/flashcards",
                    "/api/llm/models",
                ],
            }
        )

    # Import and register blueprints
    from app.routes.dictionary import dictionary_bp
    from app.routes.llm import llm_bp
    from app.routes.flashcards import flashcards_bp

    app.register_blueprint(dictionary_bp, url_prefix="/api/dictionary")
    app.register_blueprint(llm_bp, url_prefix="/api/llm")
    app.register_blueprint(flashcards_bp, url_prefix="/api/flashcards")

    return app
