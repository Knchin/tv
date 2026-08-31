/* ============================================================
   Channel catalog + EPG — MOCK DATA LAYER
   The backend provides no channel catalog or EPG, so this is a
   clean replaceable layer. `getChannelUrl` calls the bundled
   Cloudflare Pages Function `/api/token` for a fresh signed HLS
   URL (single channel "lb2"). Extend the catalog freely.
   ============================================================ */

// Channel catalog. `id` maps to the stream token channel id.
export const channels = [
  { id: "lb2", name: "LBC 2", category: "News & Entertainment", tagline: "Lebanese news, shows and entertainment live.", hd: true, color: "#1677ff", initial: "L2" },
  { id: "news24", name: "News 24", category: "News", tagline: "Global headlines streaming around the clock.", hd: true, color: "#38a0ff", initial: "N4" },
  { id: "sports", name: "Sports Live", category: "Sports", tagline: "Live matches, highlights and studio analysis.", hd: true, color: "#22d3ee", initial: "SL" },
  { id: "musicone", name: "Music One", category: "Music", tagline: "Non-stop hits and live sessions.", hd: false, color: "#5cc8ff", initial: "M1" },
  { id: "cinemaplus", name: "Cinema Plus", category: "Cinema", tagline: "Films and series, back to back.", hd: true, color: "#2e86ff", initial: "C+" },
  { id: "worldnews", name: "World News", category: "News", tagline: "International bulletin every hour.", hd: true, color: "#45d6ff", initial: "WN" },
  { id: "kidstv", name: "Kids TV", category: "Family", tagline: "Fun and learning for young viewers.", hd: false, color: "#9be7ff", initial: "K" },
];

// Only "lb2" has a real, working stream from the token function.
export const supportedStreamIds = ["lb2"];

// Fresh signed LB2 master playlist URL. This plays directly in the browser —
// the media host (games1.elahmad.store) allows cross-origin and needs no
// referer, exactly like the original working index.html. It expires (~30 min);
// mint a replacement via the same extraction recipe.
export const DEFAULT_STREAM_URL =
  "https://games1.elahmad.store/tv13_www_elahmad._lb2/index.m3u8?token=18299e873c6bee71f49d4264714f1e8b238495e4-feb0c3d464b56af0c99a161511f2649f-1788207135-1788205335";

const CATEGORIES = ["News & Entertainment", "News", "Sports", "Music", "Cinema", "Family"];

const programTitles = {
  "News & Entertainment": ["The Evening Report", "Prime Edition", "Culture Hour", "Late Debate"],
  "News": ["World Bulletin", "Breaking Now", "The Brief", "Market Watch", "Global Update"],
  "Sports": ["Matchday Live", "Post-Match", "Transfer Talk", "Highlights Hour"],
  "Music": ["Top 20 Countdown", "Unplugged Session", "Fresh Mix", "Retro Rewind"],
  "Cinema": ["Friday Night Film", "The Marquee", "Short Cuts", "Double Feature"],
  "Family": ["Morning Cartoons", "Learn & Play", "Story Time", "Junior Games"],
};

const DUR = [30, 60, 90, 30, 120];

// Build a program list starting on the hour boundary, for `count` slots.
function buildPrograms(channel, startMin, count) {
  const titles = programTitles[channel.category] || programTitles["News"];
  const out = [];
  let cursor = startMin;
  for (let i = 0; i < count; i++) {
    const dur = DUR[Math.floor(Math.random() * DUR.length)];
    out.push({
      title: titles[Math.floor(Math.random() * titles.length)],
      start: cursor,
      end: cursor + dur,
    });
    cursor += dur;
  }
  return out;
}

// Return EPG rows for the "What's On" grid across all channels.
export function getGrid(start = new Date()) {
  const root = new Date(start);
  root.setMinutes(0, 0, 0);
  const startMin = root.getHours() * 60;
  return channels.map((ch, idx) => {
    const programs = buildPrograms(ch, startMin + (idx % 2) * 15, 6);
    return { channel: ch, programs };
  });
}

// Return the now + upcoming list for a single channel (used next to player).
export function getNowNext(channel) {
  const root = new Date();
  const nowMin = root.getHours() * 60 + root.getMinutes();
  const programs = buildPrograms(channel, nowMin - 15, 4);
  const now = programs.find((p) => p.start <= nowMin && p.end > nowMin) || programs[0];
  const next = programs.filter((p) => p.start >= now.end)[0] || programs.find((p) => p !== now);
  return { now, next, nowMin };
}

// Resolve a supported channel's stream URL. For lb2 we return the embedded
// fresh signed URL directly (plays instantly, like the original index.html).
// `forceFresh` attempts to mint a brand-new token via the /api/token edge
// function; if that is unreachable (the upstream may block Cloudflare egress)
// we fall back to the last known-good URL instead of failing the playback.
export async function getChannelUrl(id, { forceFresh = false } = {}) {
  if (!supportedStreamIds.includes(id)) {
    throw new Error("Channel stream not configured on this deployment.");
  }
  if (!forceFresh) return DEFAULT_STREAM_URL;

  try {
    const res = await fetch("/api/token");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("Token service error (" + res.status + ") " + t);
    }
    const data = await res.json();
    if (!data.url) throw new Error(data.error || "No stream URL returned.");
    return data.url;
  } catch (err) {
    // Return the embedded URL so the live stream keeps working even when the
    // edge token service is blocked; surface the refresh failure to the user.
    return DEFAULT_STREAM_URL;
  }
}

export { CATEGORIES };
