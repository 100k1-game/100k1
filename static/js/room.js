/** Общие функции: комната, ID, подключение к ведущему через PeerJS */

function getRoomFromUrl() {
  return new URLSearchParams(window.location.search).get("room");
}

function generateGuestId() {
  return "g_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function createRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function hostPeerId(room) {
  return "quiz-host-" + room;
}

function waitPeerOpen(peer, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (peer.open) {
      resolve(peer);
      return;
    }
    const timer = setTimeout(() => reject(new Error("Не удалось подключиться. Проверьте интернет.")), timeoutMs);
    peer.on("open", () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function waitConnOpen(conn, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (conn.open) {
      resolve(conn);
      return;
    }
    const timer = setTimeout(() => reject(new Error("Ведущий не найден. Откройте панель ведущего.")), timeoutMs);
    conn.on("open", () => {
      clearTimeout(timer);
      resolve(conn);
    });
    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function connectToHost(room) {
  const peer = new Peer();
  await waitPeerOpen(peer);
  const conn = peer.connect(hostPeerId(room), { reliable: true });
  await waitConnOpen(conn);
  return { peer, conn };
}

function sendToHost(room, data) {
  return connectToHost(room).then(({ conn, peer }) => {
    conn.send(data);
    setTimeout(() => {
      conn.close();
      peer.destroy();
    }, 500);
  });
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
