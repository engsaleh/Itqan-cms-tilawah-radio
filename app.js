/* =========================
   DOM
========================= */
const riwayahSelect = document.getElementById("riwayah-select");
const reciterSelect = document.getElementById("reciter-select");
const surahListEl = document.getElementById("surah-list");

const stationCount = document.getElementById("station-count");
const nowSurahEl = document.getElementById("now-surah");

const radioBtn = document.getElementById("radio-btn");
const pauseBtn = document.getElementById("pause-btn");
const audio = document.getElementById("audio");

const themeToggle = document.getElementById("theme-toggle");
const html = document.documentElement;

/* =========================
   THEME
========================= */
html.dataset.theme = localStorage.getItem("theme") || "dark";
themeToggle.onclick = () => {
  const t = html.dataset.theme === "dark" ? "light" : "dark";
  html.dataset.theme = t;
  localStorage.setItem("theme", t);
};

/* =========================
   STATE
========================= */
let playlist = [];
let index = -1;

/* =========================
   API
========================= */
const API = "https://api.cms.itqan.dev/developers-api";

/* =========================
   HELPERS
========================= */
function updateControls() {
  const ready = playlist.length > 0;
  radioBtn.disabled = !ready;
  pauseBtn.disabled = !ready;
}

/* =========================
   LOAD DATA
========================= */
async function loadRiwayahs() {
  const r = await fetch(`${API}/riwayahs/?page_size=100`);
  const d = await r.json();
  riwayahSelect.innerHTML = `<option value="">اختر الرواية</option>`;
  d.results.forEach(x =>
    riwayahSelect.innerHTML += `<option value="${x.id}">${x.name_ar}</option>`
  );
}

async function loadReciters() {
  const r = await fetch(`${API}/reciters/?page_size=100`);
  const d = await r.json();
  reciterSelect.innerHTML = `<option value="">اختر القارئ</option>`;
  d.results.forEach(x =>
    reciterSelect.innerHTML += `<option value="${x.id}">${x.name_ar}</option>`
  );
}

/* =========================
   PAGINATION
========================= */
async function fetchAllTracks(assetId) {
  let page = 1;
  let all = [];
  let total = Infinity;

  while (all.length < total) {
    const r = await fetch(`${API}/recitations/${assetId}/?page=${page}`);
    const d = await r.json();
    all.push(...d.results);
    total = d.count;
    page++;
  }
  return all;
}

/* =========================
   BUILD STATION
========================= */
async function buildStation() {
  if (!riwayahSelect.value || !reciterSelect.value) return;

  playlist = [];
  index = -1;
  updateControls();

  const r = await fetch(
    `${API}/recitations/?riwayah_id=${riwayahSelect.value}&reciter_id=${reciterSelect.value}`
  );
  const d = await r.json();
  const assetId = d.results[0]?.id;
  if (!assetId) return;

  const tracks = await fetchAllTracks(assetId);

  playlist = tracks
    .filter(t => t.audio_url && t.surah_number)
    .sort((a, b) => a.surah_number - b.surah_number);

  stationCount.textContent = playlist.length;
  renderSurahs();
  updateControls();
}

/* =========================
   UI
========================= */
function renderSurahs() {
  surahListEl.innerHTML = "";
  playlist.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "surah-item";
    div.textContent = `${t.surah_number}. ${t.surah_name_ar}`;
    div.onclick = () => play(i);
    surahListEl.appendChild(div);
  });
}

function play(i) {
  index = i;
  audio.src = playlist[i].audio_url;
  nowSurahEl.textContent =
    `سورة ${playlist[i].surah_name_ar}`;
  audio.play();
}

/* =========================
   EVENTS
========================= */
radioBtn.onclick = () => index === -1 ? play(0) : audio.play();
pauseBtn.onclick = () => audio.pause();
audio.onended = () => index + 1 < playlist.length && play(index + 1);

riwayahSelect.onchange = buildStation;
reciterSelect.onchange = buildStation;

document.addEventListener("DOMContentLoaded", () => {
  loadRiwayahs();
  loadReciters();
});
