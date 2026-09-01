const room = getRoomFromUrl();

if (!room) {
  document.querySelector(".qr-card").innerHTML = `
    <p style="color:var(--gray-500);margin-bottom:1rem;">Сначала откройте <a href="host.html">панель ведущего</a> — там будет QR-код.</p>
    <a href="host.html" class="btn btn-primary btn-full">Панель ведущего</a>`;
} else {
  const guestUrl = guestPageUrl(room);
  document.getElementById("guestUrl").textContent = guestUrl;

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
    const hostUrl = new URL("host.html", window.location.href);
    hostUrl.searchParams.set("room", room);
    backLink.href = hostUrl.href;
  }
}
