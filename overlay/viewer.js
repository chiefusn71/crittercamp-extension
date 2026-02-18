// Critter Camp Overlay UI (categories -> slide-out -> critter card)
// Robust version: never fails silently, shows on-screen error if something is missing.

const DATA_URL = "../data/critter-data.json";
const POLL_MS = 2 * 60 * 1000;

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
let activeCritterId = null;

const CATEGORY_ORDER = ["mammals", "birds", "night", "water", "amphib_reptile", "insects"];

const CATEGORY_META = {
  mammals: { tip: "Mammals", icon: "🦌" },
  birds: { tip: "Birds", icon: "🐦" },
  night: { tip: "Night Critters", icon: "🦝" }, // per your request
  water: { tip: "Water Critters", icon: "🐟" },
  amphib_reptile: { tip: "Amphibians/Reptiles", icon: "🐸" },
  insects: { tip: "Insects", icon: "🦋" }
};

function showStatus(msg) {
  if (status) status.textContent = msg || "";
}

function showError(msg) {
  console.error(msg);
  showStatus(`ERROR: ${msg}`);
}

function mustExist(el, name) {
  if (!el) {
    showError(`Missing element in viewer.html: #${name}`);
    return false;
  }
  return true;
}

// Close buttons
if (panelClose) panelClose.addEventListener("click", () => closePanel());
if (cardClose) cardClose.addEventListener("click", () => card.classList.add("hidden"));

function closePanel() {
  if (panel) panel.classList.add("closed");
  activeCategory = null;
}

function openPanel(catKey) {
  activeCategory = catKey;
  if (panelTitle) panelTitle.textContent = CATEGORY_META[catKey]?.tip || "Category";
  if (panel) panel.classList.remove("closed");
  renderCritterGrid();
}

function renderCategoryRail() {
  if (!mustExist(catRail, "catRail")) return;

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
      const isOpen = panel && !panel.classList.contains("closed");
      if (activeCategory === key && isOpen) closePanel();
      else openPanel(key);
    });

    catRail.appendChild(btn);
  });
}

function renderCritterGrid() {
  if (!mustExist(critterGrid, "critterGrid")) return;

  critterGrid.innerHTML = "";

  const list = (data.critters || []).filter((c) => c.category === activeCategory);

  if (!list.length) {
    // No critters in that category (or category mismatch)
    const note = document.createElement("div");
    note.style.color = "rgba(255,255,255,0.7)";
    note.style.fontSize = "12px";
    note.textContent = "No critters found for this category.";
    critterGrid.appendChild(note);
    return;
  }

  list.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "critterBtn";
    btn.setAttribute("data-tip", c.name || c.id || "Critter");

    const ico = document.createElement("div");
    ico.className = "ico";
    // Support both "icon" and older "emoji" field, just in case
    ico.textContent = c.icon || c.emoji || "🐾";

    btn.appendChild(ico);

    btn.addEventListener("click", () => openCritter(c.id));

    critterGrid.appendChild(btn);
  });
}

function openCritter(id) {
  activeCritterId = id;

  // Validate required elements for the card
  if (!mustExist(cIcon, "cIcon")) return;
  if (!mustExist(cName, "cName")) return;
  if (!mustExist(cSummary, "cSummary")) return;
  if (!mustExist(cFact, "cFact")) return;
  if (!mustExist(card, "card")) return;

  const c = (data.critters || []).find((x) => x.id === id);
  if (!c) {
    showError(`Critter not found for id: ${id}`);
    return;
  }

  cIcon.textContent = c.icon || c.emoji || "🐾";
  cName.textContent = c.name || "";
  cSummary.textContent = c.summary || "(No summary yet)";
  cFact.textContent = c.fact || "Fact is loading… (run workflow or wait for next refresh)";

  card.classList.remove("hidden");
}

async function fetchData() {
  const url = `${DATA_URL}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data fetch failed (${res.status})`);
  const json = await res.json();

  data = {
    lastUpdated: json.lastUpdated || "",
    critters: Array.isArray(json.critters) ? json.critters : []
  };

  showStatus(data.lastUpdated ? `Facts refreshed: ${data.lastUpdated}` : "Facts: not refreshed yet");
}

async function start() {
  renderCategoryRail();

  try {
    await fetchData();
  } catch (e) {
    showError(e.message || String(e));
  }

  setInterval(async () => {
    try {
      await fetchData();

      // If panel open, keep list synced
      if (activeCategory && panel && !panel.classList.contains("closed")) {
        renderCritterGrid();
      }

      // If card open, refresh the fact automatically
      if (activeCritterId && card && !card.classList.contains("hidden")) {
        const c = (data.critters || []).find((x) => x.id === activeCritterId);
        if (c) {
          if (cFact) cFact.textContent = c.fact || cFact.textContent;
          if (cSummary) cSummary.textContent = c.summary || cSummary.textContent;
          if (cName) cName.textContent = c.name || cName.textContent;
          if (cIcon) cIcon.textContent = c.icon || c.emoji || cIcon.textContent;
        }
      }
    } catch (e) {
      showError(e.message || String(e));
    }
  }, POLL_MS);
}

start();


