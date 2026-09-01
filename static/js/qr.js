const room = getRoomFromUrl();

async function initQr() {
  if (!room) {
    document.querySelector(".qr-card").innerHTML = `
    <p style="color:var(--gray-500);margin-bottom:1rem;">Сначала откройте <a href="host.html">панель ведущего</a> — там будет QR-код.</p>
    <a href="host.html" class="btn btn-primary btn-full">Панель ведущего</a>`;
    return;
  }

  const baseUrl = await fetchServerBaseUrl();
  const guestUrl = guestPageUrl(room, baseUrl);
  document.getElementById("guestUrl").textContent = guestUrl;

  const qrCard = document.querySelector(".qr-card");
  const hint = document.createElement("p");
  hint.className = "qr-hint";
  hint.style.cssText = "color:var(--gray-500);font-size:0.85rem;margin-bottom:1rem;line-height:1.5;";
  hint.textContent = "Открывайте ссылку через http (не https). iPhone и компьютер должны быть в одной Wi‑Fi.";
  qrCard.insertBefore(hint, document.getElementById("qrcode"));

  new QRCode(document.getElementById("qrcode"), {
    text: guestUrl,
    width: 240,
    height: 240,
    colorDark: "#0a0a0a",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  document.getElementById("copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      const btn = document.getElementById("copyBtn");
      btn.textContent = "Скопировано!";
      setTimeout(() => (btn.textContent = "Скопировать ссылку"), 2000);
    } catch {
      prompt("Скопируйте ссылку:", guestUrl);
    }
  });

  const backLink = document.getElementById("backLink");
  if (backLink) {
    const hostUrl = new URL("host.html", baseUrl + "/");
    hostUrl.searchParams.set("room", room);
    backLink.href = hostUrl.href;
  }
}

initQr();
