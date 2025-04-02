from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()


def create_app():
    app = Flask(
        __name__,
        static_folder=None,  # don't let flask use its own static folder handeling
    )

    # Enable CORS only in development mode
    if os.environ.get("FLASK_ENV") == "development":
        CORS(
            app,
            resources={r"/api/*": {"origins": "http://localhost:3000"}},
            supports_credentials=True,
        )

    @app.route("/api")
    def api_info():
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

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        if not app.static_folder:
            app.static_folder = os.path.abspath(
                os.environ.get("STATIC_FOLDER", "./static")
            )

        full_path = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(full_path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, "index.html")

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
