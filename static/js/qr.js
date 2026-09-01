const room = getRoomFromUrl();

async function initQr() {
  if (!room) {
    document.querySelector(".qr-card").innerHTML = `
    <p style="color:var(--gray-500);margin-bottom:1rem;">Сначала откройте <a href="host.html">панель ведущего</a> — там будет QR-код.</p>
    <a href="host.html" class="btn btn-primary btn-full">Панель ведущего</a>`;
    return;
  }

  const qrWrap = document.getElementById("qrcode");
  const guestUrlEl = document.getElementById("guestUrl");
  const copyBtn = document.getElementById("copyBtn");
  const qrCard = document.querySelector(".qr-card");

  const statusEl = document.createElement("p");
  statusEl.style.cssText = "color:var(--gray-500);font-size:0.9rem;margin-bottom:1rem;line-height:1.5;";
  statusEl.textContent = "Готовим HTTPS-ссылку для iPhone...";
  qrCard.insertBefore(statusEl, qrWrap);

  copyBtn.disabled = true;
  guestUrlEl.textContent = "Подождите...";

  const { url: guestUrl, tunnelReady } = await fetchGuestUrl(room);

  guestUrlEl.textContent = guestUrl;
  copyBtn.disabled = false;

  statusEl.textContent = tunnelReady
    ? "QR работает на iPhone и Android (HTTPS)."
    : "HTTPS-туннель не поднялся. Скопируйте ссылку или код комнаты вручную.";

  new QRCode(qrWrap, {
    text: guestUrl,
    width: 260,
    height: 260,
    colorDark: "#0a0a0a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  const roomBox = document.createElement("div");
  roomBox.style.cssText = "margin-top:1.25rem;padding:1rem;background:var(--gray-100, #f4f4f5);border-radius:12px;text-align:center;";
  roomBox.innerHTML = `
    <p style="color:var(--gray-500);font-size:0.85rem;margin:0 0 0.5rem;">Если QR не открывается на iPhone — введите код:</p>
    <p style="font-size:1.75rem;font-weight:700;letter-spacing:0.15em;margin:0;">${room}</p>
    <p style="color:var(--gray-500);font-size:0.8rem;margin:0.75rem 0 0;">Откройте ссылку выше в Safari и введите код</p>`;
  qrCard.appendChild(roomBox);

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      copyBtn.textContent = "Скопировано!";
      setTimeout(() => (copyBtn.textContent = "Скопировать ссылку"), 2000);
    } catch {
      prompt("Скопируйте ссылку:", guestUrl);
    }
  });

  const backLink = document.getElementById("backLink");
  if (backLink) {
    backLink.href = "host.html?room=" + encodeURIComponent(room);
  }
}

initQr();
