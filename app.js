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
const API = "https://api.cms.itqan.dev";

const DEFAULT_LANG = "ar";

function getLang() {

  return localStorage.getItem("lang") || DEFAULT_LANG;
}

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, {
    headers: {
      "Accept-Language": getLang(), // ar | en
    },
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} on ${path}\n${text}`);
  }
  return r.json();
}

/* =========================
   HELPERS
========================= */
function updateControls() {
  const ready = playlist.length > 0;
  radioBtn.disabled = !ready;
  pauseBtn.disabled = !ready;
}

function getName(obj) {

  return obj?.name || "—";
}

/* =========================
   LOAD DATA
========================= */
async function loadRiwayahs() {
  const d = await apiGet(`/riwayahs/?page_size=100`);
  riwayahSelect.innerHTML = `<option value="">اختر الرواية</option>`;
  d.results.forEach((x) => {
    riwayahSelect.innerHTML += `<option value="${x.id}">${getName(x)}</option>`;
  });
}

async function loadReciters() {
  const d = await apiGet(`/reciters/?page_size=100`);
  reciterSelect.innerHTML = `<option value="">اختر القارئ</option>`;
  d.results.forEach((x) => {
    reciterSelect.innerHTML += `<option value="${x.id}">${getName(x)}</option>`;
  });
}

/* =========================
   PAGINATION
========================= */
async function fetchAllTracks(recitationId) {
  let page = 1;
  let all = [];
  let total = Infinity;

  while (all.length < total) {
    const d = await apiGet(`/recitations/${recitationId}/?page=${page}`);
    all.push(...(d.results || []));
    total = Number.isFinite(d.count) ? d.count : all.length;
    page++;
    if (!d.results || d.results.length === 0) break;
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

  const d = await apiGet(
    `/recitations/?riwayah_id=${encodeURIComponent(
      riwayahSelect.value
    )}&reciter_id=${encodeURIComponent(reciterSelect.value)}`
  );

  const recitationId = d.results?.[0]?.id;
  if (!recitationId) return;

  const tracks = await fetchAllTracks(recitationId);

  playlist = (tracks || [])
    .filter((t) => t.audio_url && (t.surah_number || t.surah))
    .sort((a, b) => (a.surah_number || 0) - (b.surah_number || 0));

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

    const num = t.surah_number ?? "—";
    const name = t.surah_name ?? "—"; // 

    div.textContent = `${num}. ${name}`;
    div.onclick = () => play(i);
    surahListEl.appendChild(div);
  });
}

function play(i) {
  index = i;
  const t = playlist[i];

  audio.src = t.audio_url;
  nowSurahEl.textContent = `سورة ${t.surah_name ?? "—"}`;
  audio.play();
}

/* =========================
   EVENTS
========================= */
radioBtn.onclick = () => (index === -1 ? play(0) : audio.play());
pauseBtn.onclick = () => audio.pause();
audio.onended = () => index + 1 < playlist.length && play(index + 1);

riwayahSelect.onchange = buildStation;
reciterSelect.onchange = buildStation;

document.addEventListener("DOMContentLoaded", () => {
  loadRiwayahs();
  loadReciters();
});
