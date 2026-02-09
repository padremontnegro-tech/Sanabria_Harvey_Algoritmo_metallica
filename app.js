// =====================
// 1) Canciones
// =====================

const canciones = [
  "Enter Sandman",
  "Master of Puppets",
  "Nothing Else Matters",
  "One",
  "Fade to Black",
  "Seek & Destroy",
  "For Whom the Bell Tolls",
  "Battery",
  "Sad But True",
  "The Unforgiven"
];

const segmentos = {
  "F": "Fan casual",
  "H": "Metalero hardcore",
  "M": "Músico / guitarrista",
  "N": "Nuevo oyente"
};

const contextos = {
  "C": "¿Cuál es mejor para un concierto?",
  "A": "¿Cuál es mejor para escuchar solo con audífonos?",
  "H": "¿Cuál representa mejor la historia de Metallica?",
  "R": "¿Cuál tiene el riff más poderoso?"
};

// Elo
const RATING_INICIAL = 1000;
const K = 32;

// =====================
// 2) Estado
// =====================

const STORAGE_KEY = "metallicamash_state_v1";

function defaultState() {
  const buckets = {};
  for (const s of Object.keys(segmentos)) {
    for (const c of Object.keys(contextos)) {
      const key = `${s}__${c}`;
      buckets[key] = {};
      canciones.forEach(song => buckets[key][song] = RATING_INICIAL);
    }
  }
  return { buckets, votes: [] };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  try { return JSON.parse(raw); }
  catch { return defaultState(); }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// =====================
// 3) Elo
// =====================

function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

function updateElo(bucket, a, b, winner) {
  const ra = bucket[a];
  const rb = bucket[b];

  const ea = expectedScore(ra, rb);
  const eb = expectedScore(rb, ra);

  const sa = winner === "A" ? 1 : 0;
  const sb = winner === "B" ? 1 : 0;

  bucket[a] = ra + K * (sa - ea);
  bucket[b] = rb + K * (sb - eb);
}

function randomPair() {
  const a = canciones[Math.floor(Math.random() * canciones.length)];
  let b = a;
  while (b === a) {
    b = canciones[Math.floor(Math.random() * canciones.length)];
  }
  return [a, b];
}

function bucketKey(s, c) {
  return `${s}__${c}`;
}

function topN(bucket, n = 10) {
  return Object.entries(bucket)
    .map(([song, rating]) => ({ song, rating }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, n);
}

// =====================
// 4) UI
// =====================

const segmentSelect = document.getElementById("segmentSelect");
const contextSelect = document.getElementById("contextSelect");
const questionEl = document.getElementById("question");
const labelA = document.getElementById("labelA");
const labelB = document.getElementById("labelB");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnNewPair = document.getElementById("btnNewPair");
const btnShowTop = document.getElementById("btnShowTop");
const btnReset = document.getElementById("btnReset");
const btnExport = document.getElementById("btnExport");
const topBox = document.getElementById("topBox");

let currentA = null;
let currentB = null;

function fillSelect(el, obj) {
  el.innerHTML = "";
  for (const [k, v] of Object.entries(obj)) {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${k} — ${v}`;
    el.appendChild(opt);
  }
}

fillSelect(segmentSelect, segmentos);
fillSelect(contextSelect, contextos);

segmentSelect.value = "F";
contextSelect.value = "C";

function refreshQuestion() {
  questionEl.textContent = contextos[contextSelect.value];
}

function newDuel() {
  [currentA, currentB] = randomPair();
  labelA.textContent = currentA;
  labelB.textContent = currentB;
  refreshQuestion();
}

function renderTop() {
  const bucket = state.buckets[bucketKey(
    segmentSelect.value,
    contextSelect.value
  )];

  topBox.innerHTML = topN(bucket).map((r, i) => `
    <div class="toprow">
      <div><b>${i + 1}.</b> ${r.song}</div>
      <div>${r.rating.toFixed(1)}</div>
    </div>
  `).join("");
}

function vote(winner) {
  const key = bucketKey(segmentSelect.value, contextSelect.value);
  const bucket = state.buckets[key];

  updateElo(bucket, currentA, currentB, winner);

  state.votes.push({
    ts: new Date().toISOString(),
    segmento: segmentos[segmentSelect.value],
    contexto: contextos[contextSelect.value],
    A: currentA,
    B: currentB,
    ganador: winner === "A" ? currentA : currentB
  });

  saveState();
  renderTop();
  newDuel();
}

btnA.onclick = () => vote("A");
btnB.onclick = () => vote("B");
btnNewPair.onclick = newDuel;
btnShowTop.onclick = renderTop;

btnReset.onclick = () => {
  if (!confirm("¿Borrar todos los votos y rankings?")) return;
  state = defaultState();
  saveState();
  renderTop();
  newDuel();
};

btnExport.onclick = () => {
  if (!state.votes.length) return alert("No hay votos");
  const headers = Object.keys(state.votes[0]);
  const rows = [
    headers.join(","),
    ...state.votes.map(v =>
      headers.map(h => `"${v[h]}"`).join(",")
    )
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "metallicamash_votos.csv";
  a.click();
  URL.revokeObjectURL(url);
};

// init
newDuel();
renderTop();
refreshQuestion();
