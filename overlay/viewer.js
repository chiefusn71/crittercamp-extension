// Critter Camp Overlay UI (categories -> slide-out -> critter card)
// Data pulled from GitHub Pages JSON, refreshed automatically.

const DATA_URL = "../data/critter-data.json";
const POLL_MS = 2 * 60 * 1000; // refresh UI often; data updates hourly via workflow

const catRail = document.getElementById("catRail");
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const panelClose = document.getElementById("panelClose");
const critterGrid = document.getElementById("critterGrid");

const card = document.getElementById("card");
const cardClose = document.getElementById("cardClose");
const cIcon = document.getElementById("cIcon");
const cName = document.getElementById("cName");
const cSummary = document.getElementById("cSummary");
const cFact = document.getElementById("cFact");

const status = document.getElementById("status");

let data = { lastUpdated: "", critters: [] };
let activeCategory = null;

const CATEGORY_ORDER = [
  "mammals",
  "birds",
  "night",
  "amphib_reptile",
  "water",
  "insects"
];

const CATEGORY_META = {
  mammals: { tip: "Mammals", icon: "🦌" },
  birds: { tip: "Birds", icon: "🐦" },
  night: { tip: "Night Critters", icon: "🦝" },          // per your request
  water: { tip: "Water Critters", icon: "🐟" },
  amphib_reptile: { tip: "Amphibians/Reptiles", icon: "🐸" },
  insects: { tip: "Insects", icon: "🦋" }
};

panelClose.addEventListener("click", () => closePanel());
cardClose.addEventListener("click", () => card.classList.add("hidden"));

function closePanel() {
  panel.classList.add("closed");
  activeCategory = null;
}

function openPanel(catKey) {
  activeCategory = catKey;
  panelTitle.textContent = CATEGORY_META[catKey]?.tip || "Category";
  panel.classList.remove("closed");
  renderCritterGrid();
}

function renderCategoryRail() {
  catRail.innerHTML = "";

  CATEGORY_ORDER.forEach((key) => {
    const meta = CATEGORY_META[key];
    const btn = document.createElement("button");
    btn.className = "catBtn";
    btn.setAttribute("data-tip", meta.tip);

    const ico = document.createElement("div");
    ico.className = "catIcon";
    ico.textContent = meta.icon;

    btn.appendChild(ico);

    btn.addEventListener("click", () => {
      // toggle behavior
      if (activeCategory === key && !panel.classList.contains("closed")) {
        closePanel();
      } else {
        openPanel(key);
      }
    });

    catRail.appendChild(btn);
  });
}

function renderCritterGrid() {
  critterGrid.innerHTML = "";

  const list = (data.critters || []).filter(c => c.category === activeCategory);

  list.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "critterBtn";
    btn.setAttribute("data-tip", c.name || c.id);

    const ico = document.createElement("div");
    ico.className = "ico";
    ico.textContent = c.icon || "🐾";

    btn.appendChild(ico);

    btn.addEventListener("click", () => {
      openCritter(c.id);
    });

    critterGrid.appendChild(btn);
  });
}

function openCritter(id) {
  const c = (data.critters || []).find(x => x.id === id);
  if (!c) return;

  cIcon.textContent = c.icon || "🐾";
  cName.textContent = c.name || "";
  cSummary.textContent = c.summary || "";
  cFact.textContent = c.fact || "…";

  card.classList.remove("hidden");
}

async function fetchData() {
  const url = `${DATA_URL}?t=${Date.now()}`; // cache-buster
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data fetch failed (${res.status})`);
  const json = await res.json();

  data = {
    lastUpdated: json.lastUpdated || "",
    critters: Array.isArray(json.critters) ? json.critters : []
  };

  status.textContent = data.lastUpdated ? `Facts refreshed: ${data.lastUpdated}` : "";
}

async function start() {
  renderCategoryRail();

  try {
    await fetchData();
  } catch (e) {
    console.error(e);
  }

  setInterval(async () => {
    try {
      await fetchData();
      // If panel open, keep it in sync
      if (activeCategory && !panel.classList.contains("closed")) {
        renderCritterGrid();
      }
      // If card open, keep fact updated without needing a re-click
      if (!card.classList.contains("hidden")) {
        const currentName = cName.textContent;
        const found = (data.critters || []).find(x => x.name === currentName);
        if (found) cFact.textContent = found.fact || cFact.textContent;
      }
    } catch (e) {
      console.error(e);
    }
  }, POLL_MS);
}

start();

