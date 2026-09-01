const guestId = sessionStorage.getItem("guest_id");
const guestName = sessionStorage.getItem("guest_name");
const guestSpecialty = sessionStorage.getItem("guest_specialty");

if (!guestId) {
  window.location.href = "/";
}

document.getElementById("playerName").textContent = guestName || "—";
document.getElementById("playerSpecialty").textContent = guestSpecialty || "—";

let questions = [];
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

async function loadQuestions() {
  const res = await fetch("/api/questions");
  questions = await res.json();
  totalQuestionsEl.textContent = questions.length;
  showQuestion();
}

function showQuestion() {
  if (currentIndex >= questions.length) {
    finishQuiz();
    return;
  }

  answered = false;
  const q = questions[currentIndex];

  questionNumber.textContent = `Вопрос ${currentIndex + 1}`;
  questionText.textContent = q.text;
  progressFill.style.width = `${((currentIndex) / questions.length) * 100}%`;
  progressLabel.textContent = `${currentIndex + 1} / ${questions.length}`;

  optionsList.innerHTML = "";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `<span class="option-letter">${letters[i]}</span><span>${opt}</span>`;
    btn.addEventListener("click", () => selectAnswer(i, btn));
    optionsList.appendChild(btn);
  });
}

async function selectAnswer(index, btn) {
  if (answered) return;
  answered = true;

  const q = questions[currentIndex];
  const buttons = optionsList.querySelectorAll(".option-btn");
  buttons.forEach((b) => (b.disabled = true));

  try {
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guest_id: guestId,
        question_id: q.id,
        answer: index,
      }),
    });

    const data = await res.json();
    score = data.score;

    if (data.correct) {
      btn.classList.add("correct");
    } else {
      btn.classList.add("incorrect");
    }
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

  await fetch(`/api/finish/${guestId}`, { method: "POST" });

  quizCard.hidden = true;
  resultCard.hidden = false;
  finalScore.textContent = score;
}

loadQuestions();
