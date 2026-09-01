const room = getRoomFromUrl();

if (!room) {
  document.querySelector(".form-card").innerHTML = `
    <h2>Вход в квиз</h2>
    <p style="color:var(--gray-500);font-size:0.9rem;line-height:1.6;margin-bottom:1rem;">
      Отсканируйте QR-код, который показывает ведущий,<br>или попросите ссылку с кодом комнаты.
    </p>
    <a href="host.html" class="btn btn-primary btn-full">Я ведущий →</a>`;
} else {
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
      const guestId = generateGuestId();
      const total = QUIZ_QUESTIONS.length;

      const { conn, peer } = await connectToHost(room);
      conn.send({
        type: "join",
        id: guestId,
        name,
        specialty,
        score: 0,
        status: "in_progress",
        current_question: 0,
        total_questions: total,
      });

      sessionStorage.setItem("guest_id", guestId);
      sessionStorage.setItem("guest_name", name);
      sessionStorage.setItem("guest_specialty", specialty);
      sessionStorage.setItem("room", room);

      conn.close();
      peer.destroy();

      window.location.href = "quiz.html?room=" + encodeURIComponent(room);
    } catch (err) {
      errorMsg.textContent = err.message || "Ошибка подключения";
      errorMsg.hidden = false;
      startBtn.disabled = false;
      startBtn.innerHTML = 'Начать <span class="btn-arrow">→</span>';
    }
  });
}
