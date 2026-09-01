// Оставьте пустым, если сайт и сервер на одном адресе (python app.py или Render).
// Для GitHub Pages укажите URL сервера, например: "https://ваш-проект.onrender.com"
const API_BASE = "";

function apiUrl(path) {
  const base = API_BASE.replace(/\/$/, "");
  return base + path;
}

async function apiAvailable() {
  try {
    const res = await fetch(apiUrl("/api/health"));
    return res.ok;
  } catch {
    return false;
  }
}
