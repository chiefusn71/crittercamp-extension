const DATA_URL = "../data/critter-data.json";
const POLL_MS = 10 * 60 * 1000; // 10 min

let state = { critters: [], lastUpdated: "" };

const rail = document.getElementById("rail");
const card = document.getElementById("card");
const closeBtn = document.getElementById("close");

const cName = document.getElementById("cName");
const cTag = document.getElementById("cTag");
const cBio = document.getElementById("cBio");
const cFact = document.getElementById("cFact");
const cSeen = document.getElementById("cSeen");
const updated = document.getElementById("updated");

closeBtn.addEventListener("click", () => card.classList.add("hidden"));

function renderRail() {
  rail.innerHTML = "";
  state.critters.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "critterBtn";
    btn.textContent = (c.buttonLabel || c.name || "Critter").slice(0, 10);
    btn.title = c.name || c.id;
    btn.addEventListener("click", () => openCard(c.id));
    rail.appendChild(btn);
  });
}

function openCard(id) {
  const c = state.critters.find((x) => x.id === id);
  if (!c) return;

  cName.textContent = c.name || "";
  cTag.textContent = c.tag || "";
  cBio.textContent = c.bio || "";
  cFact.textContent = c.funFact || "";
  cSeen.textContent = c.lastSeen || "Unknown";
  updated.textContent = state.lastUpdated ? `Updated: ${state.lastUpdated}` : "";

  card.classList.remove("hidden");
}

async function fetchData() {
  const url = `${DATA_URL}?t=${Date.now()}`; // cache-buster
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load critter data");
  const json = await res.json();

  state = {
    critters: Array.isArray(json.critters) ? json.critters : [],
    lastUpdated: json.lastUpdated || ""
  };

  renderRail();
}

async function start() {
  try { await fetchData(); } catch (e) { console.error(e); }

  setInterval(async () => {
    try { await fetchData(); } catch (e) { console.error(e); }
  }, POLL_MS);
}

start();
