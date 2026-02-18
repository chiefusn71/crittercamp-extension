/* CritterCampRCT Hover-Only UI
   - Overlay appears ONLY when mouse is over Twitch video player area
   - Hover category -> panel opens
   - Hover critter -> info card shows
   - Leaving areas auto-closes with small delay to prevent flicker
*/

const DATA_URL = "./data/critter-data.json";

// --- CONFIG (tweak later if you want) ---
const HIDE_DELAY_MS = 450;   // delay before hiding overlay when leaving video
const PANEL_CLOSE_DELAY_MS = 350;
const CARD_HIDE_DELAY_MS = 250;
const REFRESH_MS = 60 * 60 * 1000; // 60 minutes

// Category definitions (icon shown on the left rail)
const CATEGORIES = [
  { id: "mammals", label: "Mammals", icon: "🦌" },
  { id: "birds", label: "Birds", icon: "🦅" },
  { id: "night", label: "Night Critters", icon: "🦝" },
  { id: "water", label: "Water Critters", icon: "🐟" },
  { id: "amphib_reptile", label: "Amphib & Reptile", icon: "🐸" },
  { id: "insects", label: "Insects", icon: "🦋" },
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
function setStatus(msg) {
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
  // Also close sub-UI so it doesn't flash next time
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
  closePanelTimer = setTimeout(() => {
    panel.classList.add("closed");
  }, PANEL_CLOSE_DELAY_MS);
}

function showCard(critter) {
  hideCardTimer = clearTimer(hideCardTimer);

  cIcon.textContent = critter.icon || "🦌";
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
  hideCardTimer = setTimeout(() => {
    card.classList.add("hidden");
  }, CARD_HIDE_DELAY_MS);
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

    // Hover category -> open panel and show critters
    btn.addEventListener("mouseenter", () => {
      activeCategoryId = cat.id;
      panelTitle.textContent = cat.label.toUpperCase();
      renderCritterGrid(cat.id);
      openPanel();
      hideCard(true); // reset card when switching categories
    });

    // If you leave the category rail, we don't instantly close.
    // Panel will close when leaving panel area too.
    btn.addEventListener("mouseleave", () => {
      // do nothing; panel handles delayed close
    });

    catRail.appendChild(btn);
  }
}

function renderCritterGrid(categoryId) {
  const list = byCategory.get(categoryId) || [];
  grid.innerHTML = "";

  for (const c of list) {
    const b = document.createElement("div");
    b.className = "critterBtn";
    b.setAttribute("data-tip", c.name || "Critter");

    const ico = document.createElement("div");
    ico.className = "ico";
    ico.textContent = c.icon || "🦌";
    b.appendChild(ico);

    // Hover critter -> show card
    b.addEventListener("mouseenter", () => {
      showCard(c);
    });
    b.addEventListener("mouseleave", () => {
      hideCard(false);
    });

    grid.appendChild(b);
  }
}

async function loadData() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();
  critters = Array.isArray(json) ? json : (json.critters || []);
  normalizeData(critters);
}

// --- Twitch video hover detection ---
function isOverTwitchVideo(event) {
  // Use elementFromPoint so it works even if overlay is on top
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (!el) return false;

  // Twitch uses a video element + containers. We accept if:
  // - hovering over a <video>
  // - or any ancestor matches common player containers
  const isVideo = el.tagName === "VIDEO";
  const playerAncestor =
    el.closest('video') ||
    el.closest('[data-a-target="player-overlay-click-handler"]') ||
    el.closest('[data-a-target="player-overlay"]') ||
    el.closest('[data-a-target="player-theatre-mode-button"]') ||
    el.closest('[data-a-target="player-controls"]') ||
    el.closest('[data-a-target="video-player"]') ||
    el.closest('.video-player') ||
    el.closest('.player-video') ||
    el.closest('[class*="video-player"]');

  // We specifically do NOT want chat. If the hovered element is inside chat, reject.
  const inChat =
    el.closest('[data-a-target="chat-room-component-layout"]') ||
    el.closest('[data-a-target="right-column-chat-bar"]') ||
    el.closest('[class*="chat"]');

  if (inChat) return false;

  return Boolean(isVideo || playerAncestor);
}

function hookHoverVisibility() {
  document.addEventListener("mousemove", (e) => {
    const overVideo = isOverTwitchVideo(e);

    if (overVideo) {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      showRoot();
    } else {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      hideOverlayTimer = setTimeout(() => {
        hideRoot();
      }, HIDE_DELAY_MS);
    }
  });

  // Panel open/close behavior: close when leaving both rail + panel
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

  // Card stays while you are over the card itself
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
    setStatus(`Facts refreshed.`);
  } catch (err) {
    setStatus(`ERROR loading data.`);
    console.error(err);
  }

  // Auto refresh data every hour
  setInterval(async () => {
    try {
      await loadData();
      setStatus(`Facts refreshed: ${new Date().toISOString()}`);
      // If a category is open, re-render it so new facts show
      if (activeCategoryId) renderCritterGrid(activeCategoryId);
    } catch (err) {
      setStatus(`ERROR refreshing data.`);
      console.error(err);
    }
  }, REFRESH_MS);
})();

