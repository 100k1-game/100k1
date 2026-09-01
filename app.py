"""Сервер квиза — статика + API для синхронизации гостей и ведущего."""

import os
import socket
import time
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

ROOT = Path(__file__).parent
rooms: dict[str, dict] = {}

CORRECT_ANSWERS = {
    1: 1,
    2: 1,
    3: 1,
    4: 0,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
    9: 1,
    10: 2,
}


def get_local_ip() -> str | None:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        ip = sock.getsockname()[0]
        sock.close()
        return ip
    except OSError:
        return None


def public_base_url() -> str:
    public = os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL")
    if public:
        return public.rstrip("/")

    scheme = request.headers.get("X-Forwarded-Proto", request.scheme)
    host = request.host.split(":")[0]
    port = request.environ.get("SERVER_PORT", os.environ.get("PORT", "8080"))

    if host in ("localhost", "127.0.0.1"):
        local_ip = get_local_ip()
        if local_ip:
            host = local_ip

    if (scheme == "http" and str(port) == "80") or (scheme == "https" and str(port) == "443"):
        return f"{scheme}://{host}"
    return f"{scheme}://{host}:{port}"


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


@app.route("/api/info")
def server_info():
    return jsonify({"base_url": public_base_url()})


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

    data = get_room(room)
    guest_id = payload.get("guest_id") or str(uuid.uuid4())
    total = payload.get("total_questions") or 10

    if guest_id in data["guests"]:
        guest = data["guests"][guest_id]
        guest["name"] = name
        guest["specialty"] = specialty
        return jsonify({"guest_id": guest_id, "guest": guest, "resumed": True})

    guest = {
        "id": guest_id,
        "name": name,
        "specialty": specialty,
        "score": 0,
        "status": "in_progress",
        "current_question": 0,
        "total_questions": total,
        "answered_questions": [],
    }

    data["guests"][guest_id] = guest
    return jsonify({"guest_id": guest_id, "guest": guest, "resumed": False})


@app.route("/api/room/<room>/guest/<guest_id>", methods=["GET"])
def get_guest(room, guest_id):
    data = get_room(room)
    if guest_id not in data["guests"]:
        return jsonify({"error": "Участник не найден"}), 404
    return jsonify(data["guests"][guest_id])


@app.route("/api/room/<room>/guest/<guest_id>/answer", methods=["POST"])
def submit_answer(room, guest_id):
    payload = request.get_json(force=True)
    question_id = payload.get("question_id")
    answer_index = payload.get("answer_index")

    if question_id is None or answer_index is None:
        return jsonify({"error": "Некорректный ответ"}), 400

    data = get_room(room)
    if guest_id not in data["guests"]:
        return jsonify({"error": "Участник не найден"}), 404

    guest = data["guests"][guest_id]
    if guest.get("status") == "finished":
        return jsonify({"error": "Квиз уже завершён", "guest": guest}), 409

    answered = guest.setdefault("answered_questions", [])
    if question_id in answered:
        return jsonify(
            {
                "error": "На этот вопрос уже дан ответ",
                "correct": CORRECT_ANSWERS.get(question_id) == answer_index,
                "score": guest["score"],
                "guest": guest,
            }
        ), 409

    is_correct = CORRECT_ANSWERS.get(question_id) == answer_index
    if is_correct:
        guest["score"] += 1

    answered.append(question_id)
    guest["current_question"] = len(answered)
    guest["status"] = "in_progress"

    if guest["current_question"] >= guest["total_questions"]:
        guest["status"] = "finished"

    return jsonify({"correct": is_correct, "score": guest["score"], "guest": guest})


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
