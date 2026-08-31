/* ============================================================
   Theme (colour) switcher — glossy accent palette control.
   Applies a `data-theme` attribute on <html>, persists the
   choice to localStorage, and renders a swatch picker into any
   `[data-theme-switch]` mount point.
   ============================================================ */

const THEMES = [
  { id: "blue",   name: "Blue",     hex: "#1677ff" },
  { id: "pink",   name: "Pink",     hex: "#ff2e7e" },
  { id: "green",  name: "Green",    hex: "#16b867" },
  { id: "red",    name: "Red",      hex: "#ff3b3b" },
  { id: "purple", name: "Purple",   hex: "#8b2eff" },
  { id: "amber",  name: "Amber",    hex: "#f59e0b" },
  { id: "yellow", name: "Yellow",   hex: "#fde047" },
  { id: "orange", name: "Orange",   hex: "#f97316" },
  { id: "black",  name: "Black",    hex: "#8a94a6" },
];

const STORE_KEY = "nova-theme";
const DEFAULT = "blue";

function current() {
  return localStorage.getItem(STORE_KEY) || DEFAULT;
}

function apply(id, animate) {
  const htmlEl = document.documentElement;
  if (animate) htmlEl.classList.add("theme-transition");
  htmlEl.setAttribute("data-theme", id);
  // Ensure the stored value is always valid.
  localStorage.setItem(STORE_KEY, id);
  requestAnimationFrame(() => {
    setTimeout(() => htmlEl.classList.remove("theme-transition"), 600);
  });
}

export function initThemes() {
  const htmlEl = document.documentElement;
  htmlEl.setAttribute("data-theme", current());

  document.querySelectorAll("[data-theme-switch]").forEach((mount) => {
    if (mount.dataset.ready) return;
    mount.dataset.ready = "1";

    let menu = null;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "theme-btn";
    toggle.setAttribute("aria-haspopup", "true");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Change colour theme");
    toggle.title = "Change colour theme";

    const wrap = document.createElement("div");
    wrap.className = "theme-wrap";

    menu = document.createElement("div");
    menu.className = "theme-menu";
    menu.setAttribute("role", "menu");
    menu.hidden = true;

    const rows = THEMES.map((t) => {
      const row = document.createElement("div");
      row.className = "theme-row";
      row.setAttribute("role", "menuitemradio");
      row.setAttribute("aria-checked", String(t.id === current()));
      row.tabIndex = 0;
      row.dataset.themeId = t.id;
      row.innerHTML = `
        <span class="tname"><span class="tswatch" style="background:conic-gradient(from 210deg, ${t.hex}, #ffffff55, ${t.hex})"></span>${t.name}</span>
        <span class="tcheck">✓</span>`;
      row.addEventListener("click", () => select(t.id, row));
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(t.id, row); }
      });
      menu.appendChild(row);
      return row;
    });

    function syncActive() {
      menu.querySelectorAll(".theme-row").forEach((r) => {
        const on = r.dataset.themeId === current();
        r.classList.toggle("is-active", on);
        r.setAttribute("aria-checked", String(on));
      });
    }

    function select(id) {
      apply(id, true);
      syncActive();
      close();
    }

    function open() {
      syncActive();
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    }
    function close() {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.hidden ? open() : close();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    wrap.appendChild(toggle);
    wrap.appendChild(menu);
    mount.appendChild(wrap);
    syncActive();
  });
}

// Auto-init on module load matches the rest of the app's DOM-ready timing.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemes);
  } else {
    initThemes();
  }
}
