/** Комната и синхронизация через API */

function getRoomFromUrl() {
  const room = new URLSearchParams(window.location.search).get("room");
  return room ? room.trim().toUpperCase() : null;
}

function generateGuestId() {
  return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function guestPageUrl(room) {
  const url = new URL("index.html", window.location.href);
  url.searchParams.set("room", room);
  return url.href;
}

function qrPageUrl(room) {
  const url = new URL("qr.html", window.location.href);
  url.searchParams.set("room", room);
  return url.href;
}

async function joinGuest(room, name, specialty, totalQuestions) {
  const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/join`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      specialty,
      total_questions: totalQuestions,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
  return data.guest_id;
}

async function updateGuest(room, guestId, payload) {
  await fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/guest/${encodeURIComponent(guestId)}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function submitAnswer(room, guestId, questionId, answerIndex) {
  const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
  const isCorrect = question && answerIndex === question.correct;

  const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/guests`));
  const guests = await res.json();
  const current = guests.find((g) => g.id === guestId);
  const score = (current ? current.score : 0) + (isCorrect ? 1 : 0);

  await updateGuest(room, guestId, {
    score,
    current_question: questionId,
    status: "in_progress",
  });

  return { correct: isCorrect, score };
}

async function finishQuizGuest(room, guestId, score, totalQuestions) {
  await updateGuest(room, guestId, {
    score,
    current_question: totalQuestions,
    status: "finished",
  });
}

function hostPing(room) {
  fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/ping`), { method: "POST" }).catch(() => {});
}

function startHostPolling(room, onGuests, onStatus) {
  hostPing(room);
  const timer = setInterval(async () => {
    hostPing(room);
    try {
      const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/guests`));
      if (!res.ok) throw new Error("API error");
      onGuests(await res.json());
      onStatus(true, "Готов принимать гостей");
    } catch {
      onStatus(false, "Нет связи с сервером");
    }
  }, 1500);

  return () => clearInterval(timer);
}

async function checkHostOnline(room) {
  try {
    const res = await fetch(apiUrl(`/api/room/${encodeURIComponent(room)}/status`));
    if (!res.ok) return false;
    const data = await res.json();
    return data.online;
  } catch {
    return false;
  }
}

async function waitForHost(room, attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    if (await checkHostOnline(room)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function ensureApiReady() {
  const ok = await apiAvailable();
  if (!ok) {
    throw new Error(
      "Сервер не найден. Запустите на компьютере ведущего: python app.py и откройте host.html через этот же адрес."
    );
  }
}
