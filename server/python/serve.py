from app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Configure Flask to serve static files
    app.static_folder = os.environ.get("STATIC_FOLDER", "./static")
    app.run(debug=False, host="0.0.0.0", port=5000)
