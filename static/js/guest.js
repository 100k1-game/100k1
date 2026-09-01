document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const specialty = document.getElementById("specialty").value.trim();
  const errorMsg = document.getElementById("errorMsg");
  const startBtn = document.getElementById("startBtn");

  errorMsg.hidden = true;

  if (!name || !specialty) {
    errorMsg.textContent = "Заполните все поля";
    errorMsg.hidden = false;
    return;
  }

  startBtn.disabled = true;
  startBtn.textContent = "Подключение...";

  try {
    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, specialty }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Ошибка регистрации");
    }

    sessionStorage.setItem("guest_id", data.guest_id);
    sessionStorage.setItem("guest_name", name);
    sessionStorage.setItem("guest_specialty", specialty);

    window.location.href = "/quiz";
  } catch (err) {
    errorMsg.textContent = err.message;
    errorMsg.hidden = false;
    startBtn.disabled = false;
    startBtn.innerHTML = 'Начать <span class="btn-arrow">→</span>';
  }
});
