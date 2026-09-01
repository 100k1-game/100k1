"""Сервер квиза — День газовой и нефтяной промышленности (5 сентября)."""

import uuid
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = "quiz-gas-oil-2026"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Хранилище участников: {guest_id: {...}}
guests: dict[str, dict] = {}

QUIZ_QUESTIONS = [
    {
        "id": 1,
        "text": "В каком году был учреждён профессиональный праздник «День работников нефтяной и газовой промышленности»?",
        "options": ["1980", "1999", "2006", "2012"],
        "correct": 1,
    },
    {
        "id": 2,
        "text": "Какой день ежегодно отмечается как День работников нефтяной и газовой промышленности в России?",
        "options": ["1 сентября", "5 сентября", "12 сентября", "22 сентября"],
        "correct": 1,
    },
    {
        "id": 3,
        "text": "Как называется основной компонент природного газа?",
        "options": ["Этан", "Метан", "Пропан", "Бутан"],
        "correct": 1,
    },
    {
        "id": 4,
        "text": "Какой город называют «столицей российской нефти»?",
        "options": ["Тюмень", "Уфа", "Сургут", "Нижневартовск"],
        "correct": 0,
    },
    {
        "id": 5,
        "text": "Что такое ГРП в нефтедобыче?",
        "options": [
            "Газораспределительный пункт",
            "Гидравлический разрыв пласта",
            "Газорегуляторный пункт",
            "Геологоразведочная партия",
        ],
        "correct": 1,
    },
    {
        "id": 6,
        "text": "Какая компания является крупнейшим производителем нефти в России?",
        "options": ["Газпром", "Роснефть", "Лукойл", "Татнефть"],
        "correct": 1,
    },
    {
        "id": 7,
        "text": "Что измеряет единица «баррель» в нефтегазовой отрасли?",
        "options": ["Давление", "Объём нефти", "Температура", "Скорость потока"],
        "correct": 1,
    },
    {
        "id": 8,
        "text": "Как называется процесс разделения нефти на фракции?",
        "options": ["Крекинг", "Ректификация", "Полимеризация", "Гидрирование"],
        "correct": 1,
    },
    {
        "id": 9,
        "text": "Какой газ используется для детекции утечек на газопроводах (добавляется к природному газу)?",
        "options": ["Азот", "Меркаптан", "Кислород", "Аргон"],
        "correct": 1,
    },
    {
        "id": 10,
        "text": "Сколько примерно составляет доля нефтегазового сектора в экспорте России?",
        "options": ["~10%", "~25%", "~40%", "~60%"],
        "correct": 2,
    },
]


def guest_list():
    return sorted(guests.values(), key=lambda g: (-g["score"], g["name"]))


def broadcast_guests():
    socketio.emit("guests_update", guest_list())


@app.route("/")
def index():
    return render_template("guest.html")


@app.route("/quiz")
def quiz_page():
    return render_template("quiz.html")


@app.route("/host")
def host_page():
    return render_template("host.html")


@app.route("/api/questions")
def get_questions():
    safe = [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in QUIZ_QUESTIONS]
    return jsonify(safe)


@app.route("/api/join", methods=["POST"])
def join():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    specialty = (data.get("specialty") or "").strip()

    if not name or not specialty:
        return jsonify({"error": "Заполните ФИО и специальность"}), 400

    guest_id = str(uuid.uuid4())
    guest = {
        "id": guest_id,
        "name": name,
        "specialty": specialty,
        "score": 0,
        "status": "in_progress",
        "current_question": 0,
        "total_questions": len(QUIZ_QUESTIONS),
    }
    guests[guest_id] = guest
    broadcast_guests()
    return jsonify({"guest_id": guest_id})


@app.route("/api/register", methods=["POST"])
def register():
    return join()


@app.route("/api/start/<guest_id>", methods=["POST"])
def start_quiz(guest_id):
    if guest_id not in guests:
        return jsonify({"error": "Участник не найден"}), 404

    guests[guest_id]["status"] = "in_progress"
    broadcast_guests()
    return jsonify({"ok": True})


@app.route("/api/answer", methods=["POST"])
def submit_answer():
    data = request.get_json(force=True)
    guest_id = data.get("guest_id")
    question_id = data.get("question_id")
    answer = data.get("answer")

    if guest_id not in guests:
        return jsonify({"error": "Участник не найден"}), 404

    guest = guests[guest_id]
    question = next((q for q in QUIZ_QUESTIONS if q["id"] == question_id), None)

    if not question:
        return jsonify({"error": "Вопрос не найден"}), 404

    is_correct = answer == question["correct"]
    if is_correct:
        guest["score"] += 1

    guest["current_question"] = max(guest["current_question"], question_id)

    if question_id >= len(QUIZ_QUESTIONS):
        guest["status"] = "finished"

    broadcast_guests()
    return jsonify({"correct": is_correct, "score": guest["score"]})


@app.route("/api/finish/<guest_id>", methods=["POST"])
def finish_quiz(guest_id):
    if guest_id not in guests:
        return jsonify({"error": "Участник не найден"}), 404

    guests[guest_id]["status"] = "finished"
    broadcast_guests()
    return jsonify({"score": guests[guest_id]["score"]})


@socketio.on("connect")
def on_connect():
    emit("guests_update", guest_list())


@socketio.on("host_join")
def on_host_join():
    emit("guests_update", guest_list())


if __name__ == "__main__":
    print("\n  Квиз запущен!")
    print("  Гости:  http://localhost:5000/")
    print("  Ведущий: http://localhost:5000/host\n")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
