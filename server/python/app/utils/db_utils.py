import os
from typing import List, Dict, Optional, Any
from contextlib import contextmanager
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import connection
from app.models.schemas import Flashcard, LLMModel
import pathlib
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def get_encryption_key():
    """Generate encryption key from SALT_KEY environment variable."""
    salt_key = os.getenv("SALT_KEY")
    if not salt_key:
        raise ValueError("SALT_KEY environment variable is not set")

    # Convert string salt key to bytes
    salt = salt_key.encode()

    # Generate a key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )

    # Use a fixed password (could also use the salt key itself)
    key = base64.urlsafe_b64encode(kdf.derive(salt_key.encode()))
    return key


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key using the SALT_KEY."""
    if not api_key:
        return ""

    try:
        key = get_encryption_key()
        f = Fernet(key)
        encrypted_data = f.encrypt(api_key.encode())
        return encrypted_data.decode()
    except Exception as e:
        print(f"Error encrypting API key: {e}")
        # Return the original key if encryption fails
        # In production, you might want to fail more explicitly
        return api_key


def decrypt_api_key(encrypted_api_key: str) -> str:
    """Decrypt an API key using the SALT_KEY."""
    if not encrypted_api_key:
        return ""

    try:
        key = get_encryption_key()
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_api_key.encode())
        return decrypted_data.decode()
    except Exception as e:
        print(f"Error decrypting API key: {e}")
        # Return the encrypted key if decryption fails
        # In production, you might want to fail more explicitly
        return encrypted_api_key


class DatabaseManager:
    """Class to manage database operations with connection pooling"""

    _instance = None
    _connection_pool = None

    def __new__(cls):
        """Singleton pattern to ensure only one instance of DatabaseManager exists"""
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._initialize_connection_pool()
        return cls._instance

    @classmethod
    def _initialize_connection_pool(cls):
        """Initialize the connection pool if it doesn't exist"""
        if cls._connection_pool is None:
            database_url = os.getenv("DATABASE_URL")
            if database_url:
                try:
                    cls._connection_pool = pool.SimpleConnectionPool(
                        1, 20, database_url
                    )

                    # Create tables if they don't exist
                    with cls._get_connection() as conn:
                        conn.autocommit = True
                        with conn.cursor() as cursor:
                            # Read and execute schema file
                            schema_path = (
                                pathlib.Path(__file__).parent / "db_schema.sql"
                            )
                            with open(schema_path, "r") as f:
                                schema_sql = f.read()
                                cursor.execute(schema_sql)
                except Exception as e:
                    print(f"Error initializing PostgreSQL connection pool: {e}")

    @classmethod
    def _get_connection(cls) -> Optional[connection]:
        """Get a connection from the pool"""
        if cls._connection_pool:
            return cls._connection_pool.getconn()
        return None

    @classmethod
    def _release_connection(cls, conn: connection) -> None:
        """Return a connection to the pool"""
        if cls._connection_pool and conn:
            cls._connection_pool.putconn(conn)

    @contextmanager
    def get_db_connection(self):
        """Context manager for database connections"""
        conn = self._get_connection()
        try:
            if conn:
                yield conn
            else:
                yield None
        finally:
            if conn:
                self._release_connection(conn)

    def get_flashcards(self) -> List[Dict[str, Any]]:
        """Get all flashcards from database."""
        with self.get_db_connection() as conn:
            if not conn:
                return []

            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    'SELECT query, front, back, exported_at AS "exportedAt" FROM flashcards'
                )
                return cursor.fetchall()

    def add_flashcard(self, flashcard: Flashcard) -> Dict[str, Any]:
        """Add a flashcard to database."""
        with self.get_db_connection() as conn:
            if not conn:
                return {}

            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    'INSERT INTO flashcards (query, front, back, exported_at) VALUES (%s, %s, %s, %s) RETURNING query, front, back, exported_at AS "exportedAt"',
                    (
                        flashcard.query,
                        flashcard.front,
                        flashcard.back,
                        flashcard.exportedAt,
                    ),
                )
                conn.commit()
                return cursor.fetchone()

    def delete_flashcard(self, query: str, front: str, back: str) -> bool:
        """Delete a flashcard by matching query, front and back."""
        with self.get_db_connection() as conn:
            if not conn:
                return False

            with conn.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM flashcards WHERE query = %s AND front = %s AND back = %s",
                    (query, front, back),
                )
                conn.commit()
                return cursor.rowcount > 0

    def get_llm_models(self) -> List[Dict[str, Any]]:
        """Get all LLM models from database."""
        with self.get_db_connection() as conn:
            if not conn:
                return []

            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    'SELECT id, name, api_key AS "apiKey", api_endpoint AS "apiEndpoint" FROM llm_models'
                )
                results = cursor.fetchall()

                # Decrypt API keys
                for result in results:
                    if result.get("apiKey"):
                        result["apiKey"] = decrypt_api_key(result["apiKey"])

                return results

    def add_llm_model(self, model: LLMModel) -> Dict[str, Any]:
        """Add an LLM model to database."""
        with self.get_db_connection() as conn:
            if not conn:
                return {}

            # Encrypt the API key before storing
            encrypted_api_key = encrypt_api_key(model.apiKey)

            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Check if model with this ID already exists
                cursor.execute("SELECT id FROM llm_models WHERE id = %s", (model.id,))
                exists = cursor.fetchone()

                if exists:
                    cursor.execute(
                        'UPDATE llm_models SET name = %s, api_key = %s, api_endpoint = %s WHERE id = %s RETURNING id, name, api_key AS "apiKey", api_endpoint AS "apiEndpoint"',
                        (model.name, encrypted_api_key, model.apiEndpoint, model.id),
                    )
                else:
                    cursor.execute(
                        'INSERT INTO llm_models (id, name, api_key, api_endpoint) VALUES (%s, %s, %s, %s) RETURNING id, name, api_key AS "apiKey", api_endpoint AS "apiEndpoint"',
                        (model.id, model.name, encrypted_api_key, model.apiEndpoint),
                    )
                conn.commit()
                result = cursor.fetchone()
                if result and result.get("apiKey"):
                    result["apiKey"] = decrypt_api_key(result["apiKey"])
                return result

    def delete_llm_model(self, model_id: str) -> bool:
        """Delete an LLM model by ID."""
        with self.get_db_connection() as conn:
            if not conn:
                return False

            with conn.cursor() as cursor:
                cursor.execute("DELETE FROM llm_models WHERE id = %s", (model_id,))
                conn.commit()
                return cursor.rowcount > 0

    def get_prompt_template(self) -> Optional[str]:
        """Get the prompt template from the app_settings table."""
        with self.get_db_connection() as conn:
            if not conn:
                return None

            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT value FROM app_settings WHERE key = 'prompt_template'"
                )
                result = cursor.fetchone()
                return result[0] if result else None

    def save_prompt_template(self, template: str) -> bool:
        """Save or update the prompt template in the app_settings table."""
        with self.get_db_connection() as conn:
            if not conn:
                return False

            with conn.cursor() as cursor:
                cursor.execute(
                    "SELECT key FROM app_settings WHERE key = 'prompt_template'"
                )
                exists = cursor.fetchone()

                if exists:
                    cursor.execute(
                        "UPDATE app_settings SET value = %s WHERE key = 'prompt_template'",
                        (template,),
                    )
                else:
                    cursor.execute(
                        "INSERT INTO app_settings (key, value) VALUES ('prompt_template', %s)",
                        (template,),
                    )
                conn.commit()
                return True


# Create a singleton instance for global usage
db = DatabaseManager()


# Provide backwards compatibility functions for existing code
def get_flashcards() -> List[Dict[str, Any]]:
    return db.get_flashcards()


def add_flashcard(flashcard: Flashcard) -> Dict[str, Any]:
    return db.add_flashcard(flashcard)


def delete_flashcard(query: str, front: str, back: str) -> bool:
    return db.delete_flashcard(query, front, back)


def get_llm_models() -> List[Dict[str, Any]]:
    return db.get_llm_models()


def add_llm_model(model: LLMModel) -> Dict[str, Any]:
    return db.add_llm_model(model)


def delete_llm_model(model_id: str) -> bool:
    return db.delete_llm_model(model_id)


def get_prompt_template() -> Optional[str]:
    return db.get_prompt_template()


def save_prompt_template(template: str) -> bool:
    return db.save_prompt_template(template)
