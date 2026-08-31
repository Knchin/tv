/* ============================================================
   Premium Live TV — Responsive Navigation (vanilla ES module)
   Renders into any element with data-nav. Preserves the existing
   static approach, adds mobile hamburger + active-state.
   ============================================================ */

const LINKS = [
  { id: "home", label: "Home", href: "index.html" },
  { id: "live", label: "Live TV", href: "index.html#player" },
  { id: "channels", label: "Channels", href: "index.html#channels" },
  { id: "guide", label: "TV Guide", href: "index.html#guide" },
  { id: "report", label: "Report", href: "report.html" },
];

export function mountNav(activeId) {
  document.querySelectorAll("[data-nav]").forEach((root) => {
    let inner = `<a class="brand" href="index.html" aria-label="Live TV home">
        <span class="brand-mark" aria-hidden="true">▶</span>
        <span class="brand-name">NOVA<span>TV</span></span>
      </a>`;

    inner += `<nav class="nav-links" aria-label="Primary">`;
    for (const l of LINKS) {
      const active = l.id === activeId ? " is-active" : "";
      inner += `<a class="nav-link${active}" href="${l.href}">${l.label}</a>`;
    }
    inner += `</nav>`;

    inner += `<div class="nav-actions">
        <button class="nav-toggle btn" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-menu">
          <span class="burger" aria-hidden="true"></span>
        </button>
      </div>`;

    inner += `<div class="mobile-menu glass" id="mobile-menu" hidden>`;
    for (const l of LINKS) {
      const active = l.id === activeId ? " is-active" : "";
      inner += `<a class="nav-link${active}" href="${l.href}">${l.label}</a>`;
    }
    inner += `</div>`;

    root.innerHTML = inner;

    const toggle = root.querySelector(".nav-toggle");
    const menu = root.querySelector(".mobile-menu");
    toggle.addEventListener("click", () => {
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
  });
}
