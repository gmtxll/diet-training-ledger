"""Local-only server for the Diet Training Ledger PWA.

Run: python server.py
Open on the computer: http://localhost:8787
Open on an iPhone on the same Wi-Fi: http://<computer-LAN-IP>:8787
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "diet-training.db"
DEFAULT_STATE = {"meals": [], "workouts": [], "weights": [], "expenses": [], "height": 163, "draftFoods": []}


def merge_state(current: dict, incoming: dict) -> dict:
    """Preserve records created on either device instead of last-write-wins."""
    merged = {**current, **incoming}
    for key in ("meals", "workouts", "weights", "expenses", "games", "savings"):
        seen: dict[str, dict] = {}
        for item in current.get(key, []) + incoming.get(key, []):
            if not isinstance(item, dict):
                continue
            item_id = str(item.get("id") or f"{item.get('date')}:{item.get('name')}:{item.get('value')}")
            previous = seen.get(item_id)
            if previous is None or str(item.get("updatedAt", item.get("createdAt", ""))) >= str(previous.get("updatedAt", previous.get("createdAt", ""))):
                seen[item_id] = item
        merged[key] = sorted(seen.values(), key=lambda item: str(item.get("createdAt", item.get("date", ""))), reverse=True)
    return merged


def connect() -> sqlite3.Connection:
    db = sqlite3.connect(DATABASE)
    db.execute("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, updated_at TEXT NOT NULL)")
    return db


def load_state() -> dict:
    with connect() as db:
        row = db.execute("SELECT payload FROM app_state WHERE id = 1").fetchone()
    return json.loads(row[0]) if row else DEFAULT_STATE


def save_state(state: dict) -> None:
    state = merge_state(load_state(), state)
    payload = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    with connect() as db:
        db.execute(
            "INSERT INTO app_state(id,payload,updated_at) VALUES(1,?,?) "
            "ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
            (payload, datetime.now(timezone.utc).isoformat()),
        )


class Handler(BaseHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def json_response(self, status: int, data: dict) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.json_response(HTTPStatus.OK, {"ok": True, "database": str(DATABASE.name)})
            return
        if path == "/api/state":
            self.json_response(HTTPStatus.OK, {"state": load_state()})
            return
        requested = "index.html" if path in ("", "/") else path.lstrip("/")
        file_path = (ROOT / requested).resolve()
        if ROOT not in file_path.parents and file_path != ROOT:
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        if not file_path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content = file_path.read_bytes()
        mime = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", f"{mime}; charset=utf-8" if mime.startswith("text/") or mime in ("application/javascript", "application/json") else mime)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_PUT(self) -> None:
        if urlparse(self.path).path != "/api/state":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 2_000_000:
                raise ValueError("invalid payload size")
            state = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(state, dict):
                raise ValueError("state must be an object")
            save_state(state)
            self.json_response(HTTPStatus.OK, {"ok": True})
        except (ValueError, json.JSONDecodeError) as error:
            self.json_response(HTTPStatus.BAD_REQUEST, {"ok": False, "error": str(error)})

    def log_message(self, fmt: str, *args: object) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    print(f"Diet Training Ledger server: http://{args.host}:{args.port}")
    print(f"SQLite database: {DATABASE}")
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()
