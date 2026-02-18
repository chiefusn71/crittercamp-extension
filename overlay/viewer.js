/* CritterCampRCT Hover-Only UI (Stabilized)
   - Hover category -> panel opens and stays open long enough to reach it
   - Hover critter -> card shows
   - Leaving areas auto-closes with comfortable delays (no flicker)
   - Overlay doesn't vanish while interacting with rail/panel/card
*/

const DATA_URL = "../data/critter-data.json";

// --- CONFIG (tuned for human movement) ---
const OVERLAY_HIDE_DELAY_MS = 1200;   // was 450 (too fast)
const PANEL_CLOSE_DELAY_MS = 1100;    // was 350 (too fast)
const CARD_HIDE_DELAY_MS = 700;       // was 250 (too fast)
const REFRESH_MS = 60 * 60 * 1000;    // 60 minutes

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

let isInteractingWithUI = false; // key: prevents overlay hiding while using rail/panel/card

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
  isInteractingWithUI = false;
}

function openPanel() {
  panel.classList.remove("closed");
}
function scheduleClosePanel() {
  closePanelTimer = clearTimer(closePanelTimer);
  closePanelTimer = setTimeout(() => {
    panel.classList.add("closed");
    activeCategoryId = null;
  }, PANEL_CLOSE_DELAY_MS);
}
function keepPanelOpen() {
  closePanelTimer = clearTimer(closePanelTimer);
  openPanel();
}

function showCard(critter) {
  hideCardTimer = clearTimer(hideCardTimer);

  cIcon.textContent = critter.icon || "🐾";
  cName.textContent = critter.name || "Critter";
  cSummary.textContent = critter.summary || "";
  cFact.textContent = critter.fact || "";

  card.classList.remove("hidden");
}
function scheduleHideCard() {
  hideCardTimer = clearTimer(hideCardTimer);
  hideCardTimer = setTimeout(() => card.classList.add("hidden"), CARD_HIDE_DELAY_MS);
}
function keepCardOpen() {
  hideCardTimer = clearTimer(hideCardTimer);
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
      isInteractingWithUI = true;
      activeCategoryId = cat.id;
      panelTitle.textContent = cat.label.toUpperCase();
      renderCritterGrid(cat.id);
      keepPanelOpen();
      card.classList.add("hidden");
    });

    btn.addEventListener("mouseleave", () => {
      // do not close immediately; allow time to move into panel
      scheduleClosePanel();
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

    b.addEventListener("mouseenter", () => {
      isInteractingWithUI = true;
      keepPanelOpen();
      showCard(c);
    });

    b.addEventListener("mouseleave", () => {
      scheduleHideCard();
    });

    grid.appendChild(b);
  }
}

// --- Data loading ---
async function loadData() {
  const url = `${DATA_URL}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data fetch failed: ${res.status}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : (json.critters || []);
  critters = Array.isArray(list) ? list : [];
  normalizeData(critters);

  const lu = json && json.lastUpdated ? ` | ${json.lastUpdated}` : "";
  showStatus(`Loaded ${critters.length} critters${lu}`);
}

// --- Visibility gating (over Twitch video area) ---
function isOverTwitchVideo(event) {
  const el = document.elementFromPoint(event.clientX, event.clientY);
  if (!el) return false;

  const inChat =
    el.closest('[data-a-target="chat-room-component-layout"]') ||
    el.closest('[data-a-target="right-column-chat-bar"]') ||
    el.closest('[class*="chat"]');

  if (inChat) return false;

  const player =
    el.closest("video") ||
    el.closest('[data-a-target="player-overlay-click-handler"]') ||
    el.closest('[data-a-target="player-overlay"]') ||
    el.closest('[data-a-target="player-controls"]') ||
    el.closest('[data-a-target="video-player"]') ||
    el.closest(".video-player") ||
    el.closest(".player-video") ||
    el.closest('[class*="video-player"]');

  return Boolean(player);
}

function hookHoverVisibility() {
  document.addEventListener("mousemove", (e) => {
    const overVideo = isOverTwitchVideo(e);

    if (overVideo || isInteractingWithUI) {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      showRoot();
    } else {
      hideOverlayTimer = clearTimer(hideOverlayTimer);
      hideOverlayTimer = setTimeout(() => {
        // if user started interacting during delay, don't hide
        if (!isInteractingWithUI) hideRoot();
      }, OVERLAY_HIDE_DELAY_MS);
    }
  });

  // Panel area: keep open while inside
  panel.addEventListener("mouseenter", () => {
    isInteractingWithUI = true;
    keepPanelOpen();
  });
  panel.addEventListener("mouseleave", () => {
    scheduleClosePanel();
    scheduleHideCard();
    // interaction ends after grace period; overlay may hide later if not over video
    setTimeout(() => { isInteractingWithUI = false; }, 300);
  });

  // Rail area: keep open while inside
  catRail.addEventListener("mouseenter", () => {
    isInteractingWithUI = true;
    keepPanelOpen();
  });
  catRail.addEventListener("mouseleave", () => {
    scheduleClosePanel();
    setTimeout(() => { isInteractingWithUI = false; }, 300);
  });

  // Card area: keep visible while inside
  card.addEventListener("mouseenter", () => {
    isInteractingWithUI = true;
    keepCardOpen();
    keepPanelOpen();
  });
  card.addEventListener("mouseleave", () => {
    scheduleHideCard();
    setTimeout(() => { isInteractingWithUI = false; }, 300);
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
