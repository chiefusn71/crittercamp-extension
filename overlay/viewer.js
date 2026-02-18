/* CritterCampRCT Hover-Only UI
   - Overlay appears ONLY when mouse is over Twitch video player area
   - Hover category -> panel opens
   - Hover critter -> info card shows
   - Leaving areas auto-closes with small delay to prevent flicker
*/

const DATA_URL = "../data/critter-data.json"; // <-- FIXED PATH (data folder is sibling of overlay)

// --- CONFIG ---
const HIDE_DELAY_MS = 450;
const PANEL_CLOSE_DELAY_MS = 350;
const CARD_HIDE_DELAY_MS = 250;
const REFRESH_MS = 60 * 60 * 1000; // 60 minutes

const CATEGORIES = [
  { id: "mammals", label: "Mammals", icon: "🦌" },
  { id: "birds", label: "Birds", icon: "🦅" },
  { id: "night", label: "Night Critters", icon: "🦝" },
  { id: "water", label: "Water Critters", icon: "🐟" },
  { id: "amphib_reptile", label: "Amphib & Reptile", icon: "🐸" },
  { id: "insects", label: "Insects", icon: "🦋" }
];

// --- DOM ---
const root = document.getElementById("ccRoot");
const catRail = document.getElementById("catRail");
const panel = document.getElementById("panel");
const panelTitle = document.getElementById("panelTitle");
const grid = document.getElementById("critterGrid");

const card = document.getElementById("card");
const cIcon = document.getElementById("cIcon");
const cName = document.getElementById("cName");
const cSummary = document.getElementById("cSummary");
const cFact = document.getElementById("cFact");

const statusEl = document.getElementById("status");

// --- STATE ---
let critters = [];
let byCategory = new Map();
let activeCategoryId = null;

let hideOverlayTimer = null;
let closePanelTimer = null;
let hideCardTimer = null;

// --- Helpers ---
function showStatus(msg) {
  if (!statusEl) return;
  statusEl.style.display = "block";
  statusEl.textContent = msg;
}

function clearTimer(t) {
  if (t) clearTimeout(t);
  return null;
}

function showRoot() {
  root.classList.remove("hidden");
}

function hideRoot() {
  root.classList.add("hidden");
  closePanel(true);
  hideCard(true);
}

function openPanel() {
  panel.classList.remove("closed");
}
function closePanel(force = false) {
  closePanelTimer = clearTimer(closePanelTimer);
  if (force) {
    panel.classList.add("closed");
    return;
  }
  closePanelTimer = setTimeout(() => panel.classList.add("closed"), PANEL_CLOSE_DELAY_MS);
}

function showCard(critter) {
  hideCardTimer = clearTimer(hideCardTimer);

  cIcon.textContent = critter.icon || "🐾";
  cName.textContent = critter.name || "Critter";
  cSummary.textContent = critter.summary || "";
  cFact.textContent = critter.fact || "";

  card.classList.remove("hidden");
}
function hideCard(force = false) {
  hideCardTimer = clearTimer(hideCardTimer);
  if (force) {
    card.classList.add("hidden");
    return;
  }
  hideCardTimer = setTimeout(() => card.classList.add("hidden"), CARD_HIDE_DELAY_MS);
}

function normalizeData(list) {
  byCategory = new Map();
  for (const c of list) {
    const cat = c.category || "mammals";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat).push(c);
  }
}

function renderCategories() {
  catRail.innerHTML = "";
  for (const cat of CATEGORIES) {
    const btn = document.createElement("div");
    btn.className = "catBtn";
    btn.setAttribute("data-tip", cat.label);

    const ico = document.createElement("div");
    ico.className = "catIcon";
    ico.textContent = cat.icon;
    btn.appendChild(ico);

    btn.addEventListener("mouseenter", () => {
      activeCategoryId = cat.id;
      panelTitle.textContent = cat.label.toUpperCase();
      renderCritterGrid(cat.id);
      openPanel();
      hideCard(true);
    });

    catRail.appendChild(btn);
  }
}

function renderCritterGrid(categoryId) {
  const list = byCategory.get(categoryId) || [];
  grid.innerHTML = "";

  if (!list.length) {
    const msg = document.createElement("div");
    msg.style.color = "rgba(255,255,255,0.7)";
    msg.style.fontSize = "12px";
    msg.style.padding = "8px";
    msg.textContent = "No critters loaded for this category yet.";
    grid.appendChild(msg);
    return;
  }

  for (const c of list) {
    const b = document.createElement("div");
    b.className = "critterBtn";
    b.setAttribute("data-tip", c.name || "Critter");

    const ico = document.createElement("div");
    ico.className = "ico";
    ico.textContent = c.icon || "🐾";
    b.appendChild(ico);

    b.addEventListener("mouseenter", () => showCard(c));
    b.addEventListener("mouseleave", () => hideCard(false));

    grid.appendChild(b);
  }
}

// --- Data loading ---
async function loadData() {
  const url = `${DATA_URL}?t=${Date.now()}`; // cache-buster
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`);

  const json = await res.json();

  // Support either {critters:[...]} or raw array
  const list = Array.isArray(json) ? json : (json.critters || []);
  critters = Array.isArray(list) ? list : [];

  normalizeData(critters);

  const lu = (json && json.lastUpdated) ? ` | ${json.lastUpdated}` : "";
  showStatus(`Loaded ${critters.length} critters${lu}`);
}

// --- Twitch video hover detection ---
function isOverTwitchVideo(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (!el) return false;

  const inChat =
    el.closest('[data-a-target="chat-room-component-layout"]') ||
    el.closest('[data-a-target="right-column-chat-bar"]') ||
    el.closest('[class*="chat"]');

  if (inChat) return false;

  const playerAncestor =
    el.closest("video") ||
    el.closest('[data-a-target="player-overlay-click-handler"]') ||
    el.closest('[data-a-target="player-overlay"]') ||
    el.closest('[data-a-target="player-controls"]') ||
    el.closest('[data-a-target="video-player"]') ||
    el.closest('.video-player') ||
    el.closest('.player-video') ||
    el.closest('[class*="video-player"]');

  return Boolean(playerAncestor);
}

function hookHoverVisibility() {
  document.addEventListener("mousemove", (e) => {
    const overVideo = isOverTwitchVideo(e);

    if (overVideo) {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      showRoot();
    } else {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      hideOverlayTimer = setTimeout(() => hideRoot(), HIDE_DELAY_MS);
    }
  });

  panel.addEventListener("mouseenter", () => {
    closePanelTimer = clearTimer(closePanelTimer);
  });
  panel.addEventListener("mouseleave", () => {
    closePanel(false);
    hideCard(false);
  });

  catRail.addEventListener("mouseenter", () => {
    closePanelTimer = clearTimer(closePanelTimer);
  });
  catRail.addEventListener("mouseleave", () => {
    closePanel(false);
    hideCard(false);
  });

  card.addEventListener("mouseenter", () => {
    hideCardTimer = clearTimer(hideCardTimer);
  });
  card.addEventListener("mouseleave", () => {
    hideCard(false);
  });
}

// --- Init ---
(async function init() {
  renderCategories();
  hookHoverVisibility();

  try {
    await loadData();
  } catch (err) {
    console.error(err);
    showStatus(`ERROR loading data: ${err.message}`);
  }

  setInterval(async () => {
    try {
      await loadData();
      if (activeCategoryId) renderCritterGrid(activeCategoryId);
    } catch (err) {
      console.error(err);
      showStatus(`ERROR refreshing data: ${err.message}`);
    }
  }, REFRESH_MS);
})();

