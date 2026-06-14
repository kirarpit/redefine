#!/usr/bin/env python3
"""
Minimal AnkiConnect-compatible HTTP server backed by the anki Python library.

Implements the AnkiConnect API subset that Redefine uses:
  version, deckNames, createDeck, addNote

No Qt or display required — pure Rust/Python backend.
"""

import json
import logging
import os
import re
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

from anki.collection import Collection

COLLECTION_PATH = os.environ.get(
    "ANKI_COLLECTION_PATH",
    os.path.expanduser("~/.local/share/Anki2/User 1/collection.anki2"),
)
HOST = os.environ.get("ANKI_SERVER_HOST", "0.0.0.0")
PORT = int(os.environ.get("ANKI_SERVER_PORT", "8765"))
VERSION = 6

log = logging.getLogger(__name__)

_col_lock = threading.Lock()
_col: Collection | None = None


def get_col() -> Collection:
    global _col
    if _col is None:
        os.makedirs(os.path.dirname(COLLECTION_PATH), exist_ok=True)
        _col = Collection(COLLECTION_PATH)
        log.info("Opened collection at %s", COLLECTION_PATH)
    return _col


def _deck_id(col: Collection, name: str) -> int:
    deck = col.decks.by_name(name)
    if deck is not None:
        return deck["id"]
    return col.decks.add_normal_deck_with_name(name).id


def _add_single_note(col: Collection, note_data: dict) -> int:
    deck_name = note_data.get("deckName", "Default")
    model_name = note_data.get("modelName", "Basic")
    fields: dict[str, str] = note_data.get("fields", {})
    tags: list[str] = note_data.get("tags", [])
    allow_dup: bool = note_data.get("options", {}).get("allowDuplicate", False)

    notetype = col.models.by_name(model_name)
    if notetype is None:
        raise ValueError(f"note type not found: {model_name!r}")

    # Duplicate check: Anki uses the first field to detect dups within a deck.
    if not allow_dup and fields:
        first_val = next(iter(fields.values()), "")
        # Strip HTML for the search query
        plain = re.sub(r"<[^>]+>", "", first_val).strip()
        if plain and col.find_notes(f'"{plain}"'):
            raise ValueError(f"duplicate note: {plain[:60]!r}")

    note = col.new_note(notetype)
    for field_name, value in fields.items():
        if field_name in note:
            note[field_name] = value

    if tags:
        note.tags = list(tags)

    did = _deck_id(col, deck_name)
    col.add_note(note, did)
    return note.id


def dispatch(action: str, params: dict):
    with _col_lock:
        col = get_col()

        if action == "version":
            return VERSION

        if action == "deckNames":
            return [d.name for d in col.decks.all_names_and_ids()]

        if action == "createDeck":
            name = params.get("deck", "")
            if not name:
                raise ValueError("deck name required")
            return _deck_id(col, name)

        if action == "addNote":
            note_data = params.get("note")
            if not note_data:
                raise ValueError("note required")
            result = _add_single_note(col, note_data)
            return result

        if action == "addNotes":
            results = []
            for nd in params.get("notes", []):
                try:
                    results.append(_add_single_note(col, nd))
                except Exception as e:
                    log.warning("skipping note: %s", e)
                    results.append(None)
            return results

        raise ValueError(f"unsupported action: {action!r}")


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        log.debug("HTTP " + fmt, *args)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            req = json.loads(self.rfile.read(length))
        except Exception:
            self._send(400, {"result": None, "error": "invalid JSON"})
            return

        action = req.get("action", "")
        params = req.get("params", {})
        log.info("action=%s", action)

        try:
            result = dispatch(action, params)
            self._send(200, {"result": result, "error": None})
        except Exception as exc:
            log.exception("action %s failed", action)
            self._send(200, {"result": None, "error": str(exc)})

    def _send(self, status: int, data: dict):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    # Open the collection eagerly so errors surface at startup.
    with _col_lock:
        get_col()

    server = HTTPServer((HOST, PORT), Handler)
    log.info("AnkiConnect server listening on %s:%d", HOST, PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if _col:
            _col.close()
