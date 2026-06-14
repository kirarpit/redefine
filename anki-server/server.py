#!/usr/bin/env python3
"""
Minimal AnkiConnect-compatible HTTP server backed by the anki Python library.

Implements the AnkiConnect API subset that Redefine uses:
  version, deckNames, createDeck, addNote

Also adds two custom actions (not in real AnkiConnect):
  ankiwebLogin  — exchange username+password for an hkey; store hkey only
  ankiwebLogout — delete the stored hkey
  syncStatus    — report whether an hkey is stored and the last sync result

No Qt or display required — pure Rust/Python backend.
"""

import json
import logging
import os
import re
import shutil
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from anki.collection import Collection
from anki.sync import SyncAuth

COLLECTION_PATH = os.environ.get(
    "ANKI_COLLECTION_PATH",
    os.path.expanduser("~/.local/share/Anki2/User 1/collection.anki2"),
)
HOST = os.environ.get("ANKI_SERVER_HOST", "0.0.0.0")
PORT = int(os.environ.get("ANKI_SERVER_PORT", "8765"))
ANKIWEB_ENDPOINT = os.environ.get("ANKIWEB_ENDPOINT", "https://sync.ankiweb.net/")
VERSION = 6

log = logging.getLogger(__name__)

_col_lock = threading.Lock()
_col: Collection | None = None

# Stored next to the collection; persists across restarts.
_HKEY_FILE = Path(COLLECTION_PATH).parent / ".ankiweb_hkey"

# Last sync result (in-memory only, resets on restart).
_last_sync: dict = {"status": "never", "error": None}


# ---------------------------------------------------------------------------
# Collection helpers
# ---------------------------------------------------------------------------

def get_col() -> Collection:
    global _col
    if _col is None:
        os.makedirs(os.path.dirname(COLLECTION_PATH), exist_ok=True)
        _col = Collection(COLLECTION_PATH)
        log.info("Opened collection at %s", COLLECTION_PATH)
    return _col


# ---------------------------------------------------------------------------
# AnkiWeb hkey persistence
# ---------------------------------------------------------------------------

def _load_hkey() -> str | None:
    try:
        hkey = _HKEY_FILE.read_text().strip()
        return hkey or None
    except FileNotFoundError:
        return None


def _save_hkey(hkey: str) -> None:
    _HKEY_FILE.write_text(hkey)
    _HKEY_FILE.chmod(0o600)


def _delete_hkey() -> None:
    _HKEY_FILE.unlink(missing_ok=True)


def _make_auth(hkey: str) -> SyncAuth:
    auth = SyncAuth()
    auth.hkey = hkey
    auth.endpoint = ANKIWEB_ENDPOINT
    auth.io_timeout_secs = 30
    return auth


# Enum values from SyncCollectionResponse.Required
_NO_CHANGES = 0
_NORMAL_SYNC = 1
_FULL_SYNC = 2   # must choose direction
_FULL_DOWNLOAD = 3
_FULL_UPLOAD = 4

BACKUP_DIR = Path(COLLECTION_PATH).parent / "backups"
MAX_BACKUPS = 10


def _backup_collection() -> None:
    src = Path(COLLECTION_PATH)
    if not src.exists():
        return
    BACKUP_DIR.mkdir(exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dst = BACKUP_DIR / f"collection-{stamp}.anki2"
    shutil.copy2(src, dst)
    log.info("Backed up collection to %s", dst.name)
    # Prune oldest backups beyond MAX_BACKUPS
    backups = sorted(BACKUP_DIR.glob("collection-*.anki2"))
    for old in backups[:-MAX_BACKUPS]:
        old.unlink()
        log.info("Removed old backup %s", old.name)


# ---------------------------------------------------------------------------
# Sync (runs in a background thread so addNote returns immediately)
# ---------------------------------------------------------------------------

def _sync_in_background() -> None:
    hkey = _load_hkey()
    if not hkey:
        return
    threading.Thread(target=_do_sync, args=(hkey,), daemon=True).start()


def _do_sync(hkey: str) -> None:
    global _last_sync, _col
    log.info("Starting AnkiWeb sync...")
    with _col_lock:
        col = get_col()
        try:
            _backup_collection()
            auth = _make_auth(hkey)
            output = col.sync_collection(auth, sync_media=False)
            required = output.required

            if required in (_NO_CHANGES, _NORMAL_SYNC):
                _last_sync = {"status": "ok", "error": None}
                log.info("AnkiWeb sync completed (normal)")

            elif required == _FULL_SYNC:
                # Collections have never shared history. Always download from
                # AnkiWeb so the user's existing cards are never overwritten.
                log.info("Full sync required — downloading from AnkiWeb to preserve existing cards")
                col.close_for_full_sync()
                col.full_upload_or_download(auth=auth, server_usn=None, upload=False)
                # The collection file was replaced; reopen on next use.
                _col = None
                _last_sync = {"status": "ok", "error": None}
                log.info("Full download from AnkiWeb completed")

            elif required in (_FULL_DOWNLOAD, _FULL_UPLOAD):
                # Server explicitly directed a one-way sync.
                upload = required == _FULL_UPLOAD
                log.info("Directed full sync: upload=%s", upload)
                col.close_for_full_sync()
                col.full_upload_or_download(auth=auth, server_usn=None, upload=upload)
                _col = None
                _last_sync = {"status": "ok", "error": None}
                log.info("Directed full sync completed")

            else:
                _last_sync = {"status": "ok", "error": None}
                log.info("Sync completed (required=%d)", required)

        except Exception as exc:
            _last_sync = {"status": "error", "error": str(exc)}
            log.error("AnkiWeb sync failed: %s", exc)


# ---------------------------------------------------------------------------
# Note helpers
# ---------------------------------------------------------------------------

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

    if not allow_dup and fields:
        first_val = next(iter(fields.values()), "")
        plain = re.sub(r"<[^>]+>", "", first_val).strip()
        if plain and col.find_notes(f'"{plain}"'):
            raise ValueError(f"duplicate note: {plain[:60]!r}")

    note = col.new_note(notetype)
    for field_name, value in fields.items():
        if field_name in note:
            note[field_name] = value
    if tags:
        note.tags = list(tags)

    col.add_note(note, _deck_id(col, deck_name))
    return note.id


# ---------------------------------------------------------------------------
# Action dispatcher
# ---------------------------------------------------------------------------

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
            _sync_in_background()
            return result

        if action == "addNotes":
            results = []
            for nd in params.get("notes", []):
                try:
                    results.append(_add_single_note(col, nd))
                except Exception as exc:
                    log.warning("skipping note: %s", exc)
                    results.append(None)
            _sync_in_background()
            return results

        # Custom actions not in real AnkiConnect

        if action == "ankiwebLogin":
            username = params.get("username", "")
            password = params.get("password", "")
            if not username or not password:
                raise ValueError("username and password required")
            auth = col.sync_login(username, password, ANKIWEB_ENDPOINT)
            _save_hkey(auth.hkey)
            log.info("AnkiWeb login successful, hkey stored")
            return "ok"

        if action == "ankiwebLogout":
            _delete_hkey()
            return "ok"

        if action == "syncStatus":
            return {
                "connected": _load_hkey() is not None,
                "lastSync": _last_sync,
            }

        raise ValueError(f"unsupported action: {action!r}")


# ---------------------------------------------------------------------------
# HTTP handler
# ---------------------------------------------------------------------------

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

        # Don't log params for login — would expose credentials in logs.
        if action != "ankiwebLogin":
            log.info("action=%s", action)
        else:
            log.info("action=ankiwebLogin")

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


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    with _col_lock:
        get_col()

    if _load_hkey():
        log.info("AnkiWeb hkey found — sync enabled")
    else:
        log.info("No AnkiWeb hkey — sync disabled until login")

    server = HTTPServer((HOST, PORT), Handler)
    log.info("AnkiConnect server listening on %s:%d", HOST, PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if _col:
            _col.close()
