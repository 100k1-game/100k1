const guestId = sessionStorage.getItem("guest_id");
const guestName = sessionStorage.getItem("guest_name");
const guestSpecialty = sessionStorage.getItem("guest_specialty");
const room = getRoomFromUrl() || sessionStorage.getItem("room");

if (!guestId || !room) {
  window.location.href = "index.html";
}

document.getElementById("playerName").textContent = guestName || "—";
document.getElementById("playerSpecialty").textContent = guestSpecialty || "—";

const questions = QUIZ_QUESTIONS.map(({ id, text, options }) => ({ id, text, options }));
let currentIndex = 0;
let score = 0;
let answered = false;

const quizCard = document.getElementById("quizCard");
const resultCard = document.getElementById("resultCard");
const questionNumber = document.getElementById("questionNumber");
const questionText = document.getElementById("questionText");
const optionsList = document.getElementById("optionsList");
const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");
const finalScore = document.getElementById("finalScore");
const totalQuestionsEl = document.getElementById("totalQuestions");

const letters = ["A", "B", "C", "D"];

totalQuestionsEl.textContent = questions.length;
showQuestion();

function showQuestion() {
  if (currentIndex >= questions.length) {
    finishQuiz();
    return;
  }

  answered = false;
  const q = questions[currentIndex];

  questionNumber.textContent = `Вопрос ${currentIndex + 1}`;
  questionText.textContent = q.text;
  progressFill.style.width = `${(currentIndex / questions.length) * 100}%`;
  progressLabel.textContent = `${currentIndex + 1} / ${questions.length}`;

  optionsList.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener("click", () => selectAnswer(i, btn, q));
    optionsList.appendChild(btn);
  });
}

async function selectAnswer(index, btn, q) {
  if (answered) return;
  answered = true;

  const buttons = optionsList.querySelectorAll(".option-btn");
  buttons.forEach((b) => (b.disabled = true));

  try {
    const data = await submitAnswer(room, guestId, q.id, index);
    score = data.score;
    btn.classList.add(data.correct ? "correct" : "incorrect");
  } catch {
    btn.classList.add("incorrect");
  }

  setTimeout(() => {
    currentIndex++;
    showQuestion();
  }, 800);
}

async function finishQuiz() {
  progressFill.style.width = "100%";
  progressLabel.textContent = `${questions.length} / ${questions.length}`;

  await finishQuizGuest(room, guestId, score, questions.length);

  quizCard.hidden = true;
  resultCard.hidden = false;
  finalScore.textContent = score;
}
