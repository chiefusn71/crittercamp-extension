// Critter Camp Extension Overlay
// Fetches critter data from GitHub Pages JSON and refreshes automatically.

const DATA_URL = "../data/critter-data.json";

// How often the overlay checks for new data (2 minutes)
const POLL_MS = 2 * 60 * 1000;

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

  (state.critters || []).forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "critterBtn";

    // Button label priority: buttonLabel > shortName > first word of name > id
    const label =
      c.buttonLabel ||
      c.shortName ||
      (c.name ? c.name.split(" ")[0] : "") ||
      c.id ||
      "Critter";

    btn.textContent = String(label).slice(0, 12);
    btn.title = c.name || c.id || "Critter";

    btn.addEventListener("click", () => openCard(c.id));
    rail.appendChild(btn);
  });
}

function openCard(id) {
  const c = (state.critters || []).find((x) => x.id === id);
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
  // cache-buster avoids stale JSON
  const url = `${DATA_URL}?t=${Date.now()}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load critter data (${res.status})`);

  const json = await res.json();

  state = {
    critters: Array.isArray(json.critters) ? json.critters : [],
    lastUpdated: json.lastUpdated || ""
  };

  renderRail();
}

async function start() {
  // initial load
  try {
    await fetchData();
  } catch (e) {
    console.error("Initial data load failed:", e);
  }

  // periodic refresh
  setInterval(async () => {
    try {
      await fetchData();
    } catch (e) {
      console.error("Periodic data refresh failed:", e);
    }
  }, POLL_MS);
}

start();
