"""Сервер квиза — статика + API для синхронизации гостей и ведущего."""

import os
import time
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

ROOT = Path(__file__).parent
rooms: dict[str, dict] = {}


def get_room(room: str) -> dict:
    room = room.upper()
    if room not in rooms:
        rooms[room] = {"active": 0, "guests": {}}
    return rooms[room]


def guest_list(room: str) -> list:
    data = get_room(room)
    guests = list(data["guests"].values())
    return sorted(guests, key=lambda g: (-g["score"], g["name"]))


@app.route("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    if (ROOT / filename).is_file():
        return send_from_directory(ROOT, filename)
    return jsonify({"error": "Not found"}), 404


@app.route("/api/health")
def health():
    return jsonify({"ok": True})


@app.route("/api/room/<room>/ping", methods=["POST"])
def ping_room(room):
    data = get_room(room)
    data["active"] = int(time.time())
    return jsonify({"ok": True, "room": room.upper()})


@app.route("/api/room/<room>/status")
def room_status(room):
    data = get_room(room)
    active = data["active"]
    online = active and (int(time.time()) - active) < 15
    return jsonify({"online": online, "room": room.upper()})


@app.route("/api/room/<room>/guests")
def list_guests(room):
    return jsonify(guest_list(room))


@app.route("/api/room/<room>/join", methods=["POST"])
def join_room(room):
    payload = request.get_json(force=True)
    name = (payload.get("name") or "").strip()
    specialty = (payload.get("specialty") or "").strip()

    if not name or not specialty:
        return jsonify({"error": "Заполните ФИО и специальность"}), 400

    guest_id = payload.get("guest_id") or str(uuid.uuid4())
    total = payload.get("total_questions") or 10

    guest = {
        "id": guest_id,
        "name": name,
        "specialty": specialty,
        "score": 0,
        "status": "in_progress",
        "current_question": 0,
        "total_questions": total,
    }

    get_room(room)["guests"][guest_id] = guest
    return jsonify({"guest_id": guest_id, "guest": guest})


@app.route("/api/room/<room>/guest/<guest_id>", methods=["POST"])
def update_guest(room, guest_id):
    payload = request.get_json(force=True)
    data = get_room(room)

    if guest_id not in data["guests"]:
        return jsonify({"error": "Участник не найден"}), 404

    guest = data["guests"][guest_id]
    for key in ("score", "status", "current_question", "name", "specialty"):
        if key in payload:
            guest[key] = payload[key]

    return jsonify({"guest": guest})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print("\n  Квиз запущен!")
    print(f"  Ведущий: http://localhost:{port}/host.html")
    print(f"  QR-код:  http://localhost:{port}/qr.html")
    print("  (для телефонов в Wi-Fi замените localhost на IP компьютера)\n")
    app.run(host="0.0.0.0", port=port, debug=False)
