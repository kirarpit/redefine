from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()


def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={r"/api/*": {"origins": "http://localhost:3000"}},
        supports_credentials=True,
    )

    @app.route("/")
    def home():
        return jsonify(
            {
                "status": "ok",
                "message": "Redefine API server is running",
                "endpoints": [
                    "/api/explain/search",
                    "/api/explain/autosuggest",
                    "/api/flashcards",
                    "/api/llm/models",
                    "/api/settings/prompt-template",
                ],
            }
        )

    # Register blueprints
    from app.routes.explanation import explanation_bp
    from app.routes.llm import llm_bp
    from app.routes.flashcards import flashcards_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(explanation_bp, url_prefix="/api/explain")
    app.register_blueprint(llm_bp, url_prefix="/api/llm")
    app.register_blueprint(flashcards_bp, url_prefix="/api/flashcards")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")

    return app
