const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = createRoomId();
  history.replaceState(null, "", "?room=" + room);
}

document.getElementById("roomCode").textContent = room;

const qrLink = document.getElementById("qrLink");
qrLink.href = qrPageUrl(room);

const guestsTable = document.getElementById("guestsTable");
const statTotal = document.getElementById("statTotal");
const statActive = document.getElementById("statActive");
const statFinished = document.getElementById("statFinished");
const connectionStatus = document.getElementById("connectionStatus");

const STATUS_LABELS = {
  waiting: "Ожидает",
  in_progress: "Проходит",
  finished: "Завершил",
};

const guests = {};
let previousIds = new Set();

const peer = new Peer(hostPeerId(room));

peer.on("open", () => {
  connectionStatus.innerHTML = '<span class="dot-live"></span> Ожидание гостей';
  connectionStatus.classList.add("connected");
});

peer.on("error", () => {
  connectionStatus.textContent = "Ошибка подключения";
  connectionStatus.classList.remove("connected");
});

peer.on("connection", (conn) => {
  conn.on("data", (data) => {
    if (data.type === "join") {
      guests[data.id] = {
        id: data.id,
        name: data.name,
        specialty: data.specialty,
        score: 0,
        status: "in_progress",
        current_question: 0,
        total_questions: data.total_questions || QUIZ_QUESTIONS.length,
      };
    } else if (data.type === "update" && guests[data.id]) {
      Object.assign(guests[data.id], data);
    }
    renderGuests();
  });
});

function renderGuests() {
  const list = Object.values(guests).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "ru");
  });

  statTotal.textContent = list.length;
  statActive.textContent = list.filter((g) => g.status === "in_progress").length;
  statFinished.textContent = list.filter((g) => g.status === "finished").length;

  if (list.length === 0) {
    guestsTable.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Ожидание участников... Покажите QR-код гостям</td>
      </tr>`;
    previousIds = new Set();
    return;
  }

  const currentIds = new Set(list.map((g) => g.id));

  guestsTable.innerHTML = list
    .map((g, i) => {
      const isNew = !previousIds.has(g.id);
      const progress =
        g.status === "finished"
          ? `${g.total_questions}/${g.total_questions}`
          : `${g.current_question}/${g.total_questions}`;

      return `
        <tr class="${isNew ? "row-new" : ""}">
          <td>${i + 1}</td>
          <td><strong>${escapeHtml(g.name)}</strong></td>
          <td>${escapeHtml(g.specialty)}</td>
          <td class="score-cell">${g.score}</td>
          <td class="progress-cell">${progress}</td>
          <td><span class="status-badge status-${g.status}">${STATUS_LABELS[g.status] || g.status}</span></td>
        </tr>`;
    })
    .join("");

  previousIds = currentIds;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
