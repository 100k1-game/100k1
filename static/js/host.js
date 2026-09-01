const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (!room) {
  room = createRoomId();
  history.replaceState(null, "", "?room=" + room);
} else {
  room = room.trim().toUpperCase();
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

let previousIds = new Set();

async function initHost() {
  const ok = await apiAvailable();
  if (!ok) {
    connectionStatus.textContent = "Запустите: python app.py";
    connectionStatus.classList.remove("connected");
    guestsTable.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Сначала запустите сервер на компьютере: python app.py</td>
      </tr>`;
    return;
  }

  startHostPolling(
    room,
    (guests) => renderGuests(guests),
    (connected, message) => {
      if (connected) {
        connectionStatus.innerHTML = '<span class="dot-live"></span> ' + message;
        connectionStatus.classList.add("connected");
      } else {
        connectionStatus.textContent = message;
        connectionStatus.classList.remove("connected");
      }
    }
  );
}

function renderGuests(guests) {
  statTotal.textContent = guests.length;
  statActive.textContent = guests.filter((g) => g.status === "in_progress").length;
  statFinished.textContent = guests.filter((g) => g.status === "finished").length;

  if (guests.length === 0) {
    guestsTable.innerHTML = `
      <tr class="empty-row">
        <td colspan="6">Ожидание участников... Покажите QR-код гостям</td>
      </tr>`;
    previousIds = new Set();
    return;
  }

  const currentIds = new Set(guests.map((g) => g.id));

  guestsTable.innerHTML = guests
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

initHost();
