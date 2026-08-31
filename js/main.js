/* ============================================================
   NOVA TV — main entry (ES module)
   Wires nav, player, channels, now/next and TV guide together.
   ============================================================ */
import { LivePlayer } from "./player.js";
import { mountNav } from "./nav.js";
import { channels, getGrid, getNowNext, getChannelUrl, supportedStreamIds } from "./data.js";

mountNav("home");

/* ---------- State ---------- */
const state = {
  currentId: "lb2",
  lastUrl: null,
};

const $ = (sel) => document.querySelector(sel);
const frame = $("#frame");
const video = $("#video");
const ovl = {
  loading: $("#ovl-loading"),
  interact: $("#ovl-interact"),
  reconnect: $("#ovl-reconnect"),
  error: $("#ovl-error"),
};
const errSub = $("#ovl-error-sub");
const statusEl = $("#player-status");

const player = new LivePlayer(video, onPlayerState);

function onPlayerState(s) {
  for (const k in ovl) ovl[k].hidden = true;

  switch (s.type) {
    case "loading":
      ovl.loading.hidden = false;
      statusEl.textContent = "Connecting…";
      break;
    case "buffering":
      ovl.loading.hidden = false;
      statusEl.textContent = "Buffering…";
      break;
    case "ready":
      statusEl.textContent = "Live";
      break;
    case "playing":
      statusEl.textContent = "● Live";
      frame.classList.add("is-live");
      break;
    case "reconnecting":
      ovl.reconnect.hidden = false;
      statusEl.textContent = "Reconnecting…";
      break;
    case "needsInteraction":
      ovl.interact.hidden = false;
      statusEl.textContent = "Tap to play";
      break;
    case "error":
      ovl.error.hidden = false;
      statusEl.textContent = "Unavailable";
      break;
    case "ended":
      statusEl.textContent = "Stream ended";
      break;
    default:
      statusEl.textContent = "";
  }
}

/* ---------- Channel selection ---------- */
function setChannel(ch, opts = {}) {
  state.currentId = ch.id;
  frame.classList.remove("is-live");
  statusEl.textContent = "Loading…";

  // Update info strip
  $("#info-name").textContent = ch.name;
  $("#info-category").textContent = ch.category;
  $("#info-tagline").textContent = ch.tagline;
  $("#info-avatar").textContent = ch.initial;
  $("#info-avatar").style.setProperty("--chip-color", ch.color);
  $("#chrome-title").textContent = ch.name;

  // Update card selection
  document.querySelectorAll(".channel-card").forEach((c) => {
    c.classList.toggle("is-selected", c.dataset.id === ch.id);
  });

  // Now / next
  const nn = getNowNext(ch);
  $("#nn-now-title").textContent = nn.now ? nn.now.title : "—";
  $("#nn-now-time").textContent = nn.now ? fmtRange(nn.now) : "—";
  $("#nn-next-title").textContent = nn.next ? nn.next.title : "—";
  $("#nn-next-time").textContent = nn.next ? fmtRange(nn.next) : "—";
  const pct = nn.now ? clamp(((nn.nowMin - nn.now.start) / (nn.now.end - nn.now.start)) * 100, 0, 100) : 0;
  $("#nn-now-progress").style.width = pct.toFixed(1) + "%";
  $("#info-now").textContent = nn.now ? `On now · ${nn.now.title}` : "";

  loadStream(ch);
}

function fmtRange(p) {
  const f = (m) => String(m).padStart(2, "0");
  return `${f(Math.floor(p.start / 60))}:${f(p.start % 60)} – ${f(Math.floor(p.end / 60))}:${f(p.end % 60)}`;
}
function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

async function loadStream(ch) {
  ovl.loading.hidden = false;
  statusEl.textContent = "Fetching fresh signal…";
  try {
    const url = await getChannelUrl(ch.id);
    state.lastUrl = url;
    $("#stream-input").value = url;
    player.load(url);
  } catch (err) {
    errSub.textContent = err.message || "Could not load the live signal.";
    for (const k in ovl) ovl[k].hidden = true;
    ovl.error.hidden = false;
    statusEl.textContent = "Unavailable";
    frame.classList.remove("is-live");
  }
}

/* ============================================================
   Channels carousel
   ============================================================ */
function renderChannels() {
  const carousel = $("#carousel");
  carousel.innerHTML = channels.map((ch) => {
    const playable = supportedStreamIds.includes(ch.id);
    return `
      <article class="channel-card${ch.id === state.currentId ? " is-selected" : ""}" data-id="${ch.id}" tabindex="0" role="button" aria-label="Watch ${ch.name}">
        <div class="cc-top">
          <span class="cc-badge" style="--cc:${ch.color}">${ch.initial}</span>
          ${playable ? '<span class="live-tag"><span class="ldot"></span>Live</span>' : '<span class="pill" style="font-size:0.62rem">Preview</span>'}
        </div>
        <h3>${ch.name}</h3>
        <div class="cc-cat">${ch.category}</div>
        <div class="cc-meta">${ch.hd ? '<span class="hd-tag">HD</span>' : ""}${playable ? "" : '<span style="font-size:0.72rem;color:var(--text-faint)">stream unconfigured</span>'}</div>
      </article>`;
  }).join("");

  carousel.querySelectorAll(".channel-card").forEach((card) => {
    card.addEventListener("click", () => {
      const ch = channels.find((c) => c.id === card.dataset.id);
      if (ch) { setChannel(ch); scrollToPlayer(); }
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });
}

function scrollToPlayer() {
  $("#player").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ============================================================
   TV Guide
   ============================================================ */
function renderGuide() {
  const grid = $("#guide-grid");
  const rows = getGrid();

  const maxEnd = Math.max(...rows.flatMap((r) => r.programs.map((p) => p.end)));
  const minStart = Math.min(...rows.flatMap((r) => r.programs.map((p) => p.start)));
  const span = maxEnd - minStart || 1;

  grid.innerHTML = rows.map((row) => {
    const nowProg = row.programs.find((p) => {
      const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      return p.start <= nowMin && p.end > nowMin;
    });
    const isNow = !!nowProg;
    const progs = row.programs.map((p) => {
      const w = (p.end - p.start) / span * 100;
      return `<div class="guide-prog${p === nowProg ? " now" : ""}" style="flex:${w}">
                <div class="gp-title">${p.title}</div>
                <div class="gp-time">${fmtRange(p)}</div>
              </div>`;
    }).join("");
    return `
      <div class="guide-row${isNow ? " is-now" : ""}">
        <div class="guide-channel">
          <span class="mini" style="--cc:${row.channel.color}">${row.channel.initial}</span>
          <span class="gname">${row.channel.name}</span>
        </div>
        <div class="guide-programs">${progs}</div>
      </div>`;
  }).join("");

  $("#guide-status").textContent = "Times in local time · updated just now";
}

/* ============================================================
   URL input
   ============================================================ */
$("#btn-play-url").addEventListener("click", () => {
  const url = $("#stream-input").value.trim();
  if (!url) return;
  state.lastUrl = url;
  player.load(url);
});
$("#stream-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("#btn-play-url").click();
});

$("#btn-retry").addEventListener("click", () => {
  if (state.lastUrl) player.retry(state.lastUrl);
  else setChannel(channels.find((c) => c.id === state.currentId));
});

$("#btn-regenerate").addEventListener("click", () => {
  setChannel(channels.find((c) => c.id === state.currentId));
});

$("#btn-fs").addEventListener("click", () => player.toggleFullscreen());

$("#btn-pip").addEventListener("click", async () => {
  await player.togglePictureInPicture();
});

// User-gesture resume for the autoplay-block overlay (no policy bypass).
ovl.interact.addEventListener("click", () => {
  if (state.lastUrl) player.retry(state.lastUrl);
});

$("#btn-share").addEventListener("click", async (e) => {
  e.preventDefault();
  const ch = channels.find((c) => c.id === state.currentId);
  try {
    if (navigator.share) {
      await navigator.share({ title: `Watch ${ch.name} live`, url: location.href.split("#")[0] + "#player" });
    } else {
      await navigator.clipboard.writeText(location.href.split("#")[0] + "#player");
      statusEl.textContent = "Link copied";
    }
  } catch (err) { /* cancelled */ }
});

/* ---------- Init ---------- */
renderChannels();
renderGuide();
const initial = channels.find((c) => c.id === "lb2");
setChannel(initial, { silent: true });

/* Reconnect when tab becomes visible again (live streams drift). */
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.lastUrl) {
    player.retry(state.lastUrl);
  }
});
