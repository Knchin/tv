// LB2 HLS streaming proxy for Cloudflare Pages Functions.
//
// games1.elahmad.store serves elahmad's LB2 feed. Elahmad only hands out real
// playback tokens to residential IPs: datacenter networks (GitHub runners,
// Cloudflare egress, CI boxes) get a static placeholder instead, so the mint
// can NOT happen from this function's own network.
//
// Strategy:
//   1. Prefer the COMMITTED token URL (assets/channels_canonical.json, from
//      the same deployment). It is re-minted on a residential machine by
//      scripts/mint-home.sh and pushed to main.
//   2. Fall back to a fresh server-side mint only when there is no committed
//      URL (in practice that mint returns the placeholder -> clean 503).
//   3. Proxy the whole HLS fetch on ONE side — this function's egress:
//      fetch the upstream master/variants/segments and rewrite every URI to
//      point back at /api/stream. Segment/variant requests never mint again.
//
// The browser only ever talks to this same-origin endpoint, so no CORS
// headers are required and no IP trust is placed in the visitor.

const CHANNEL = "lb2";
const SOURCE = {
  page: "https://www.elahmad.ru/tv/mobiletv/glarb.php?id=" + CHANNEL,
  result: "https://www.elahmad.ru/tv/result/embed_result_elahmad_81.php",
  post: "id=" + CHANNEL,
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const CATALOG_URL = "/assets/channels_canonical.json";
const CATALOG_TTL_MS = 120000;

const HLS_HEADERS = {
  "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store, max-age=0",
};
const BIN_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store, max-age=0",
};

let catalogCache = { at: 0, lb2Url: null };

export async function onRequest(context) {
  const u = new URL(context.request.url);
  const a = u.searchParams.get("a") || "playlist";
  const relUrl = u.searchParams.get("url");
  const self = u.origin + "/api/stream";

  try {
    // Variant / segment / key requests carry an absolute upstream URL and just
    // proxy it. Never mint here — a fresh mint from Cloudflare egress yields
    // the elahmad placeholder and would kill playback for every fragment.
    if (relUrl) return await serveUpstream(relUrl, a, self);

    // Root playlist (no url param): resolve the master from the committed
    // token first, fresh server-side mint only as a fallback.
    const master = await resolveMaster(u.origin);
    return await servePlaylist(master, self);
  } catch (e) {
    return text("Proxy error: " + String((e && e.message) || e), e && e.isOffline ? 503 : 500);
  }
}

async function serveUpstream(relUrl, a, self) {
  if (!allowed(relUrl)) return text("Bad URL", 400);
  const r = await fetch(relUrl, { headers: { "User-Agent": UA } });
  if (isPlaylistUrl(relUrl)) {
    if (!r.ok) return text("Upstream " + relUrl.split("/")[2] + ": " + r.status, 502);
    const body = await r.text();
    const baseDir = relUrl.slice(0, relUrl.lastIndexOf("/") + 1);
    return new Response(rewritePlaylist(body, baseDir, self), {
      status: 200,
      headers: HLS_HEADERS,
    });
  }
  const ct = r.headers.get("content-type") || "video/MP2T";
  return new Response(r.body, {
    status: r.status,
    headers: Object.assign({ "Content-Type": ct }, BIN_HEADERS),
  });
}

async function servePlaylist(master, self) {
  if (!allowed(master)) return text("Bad playlist URL", 400);
  const r = await fetch(master, { headers: { "User-Agent": UA } });
  if (!r.ok) return text("Upstream " + master.split("/")[2] + ": " + r.status, 502);
  const body = await r.text();
  // Relative URIs inside a playlist resolve against THAT playlist's own
  // directory (the variant lives in tracks-v1a1/, the master at the root).
  const baseDir = master.slice(0, master.lastIndexOf("/") + 1);
  return new Response(rewritePlaylist(body, baseDir, self), {
    status: 200,
    headers: HLS_HEADERS,
  });
}

// Prefer the committed URL; a fresh server-side mint is only a fallback.
async function resolveMaster(origin) {
  const committed = await getCommittedToken(origin);
  if (committed) {
    if (isUnexpired(committed)) return committed;
    const err = new Error(
      "LB2 stream token has expired; it must be refreshed from a residential network to resume playback."
    );
    err.isOffline = true;
    throw err;
  }
  const minted = await mintTokenUrl();
  return minted.master;
}

// Read the committed LB2 URL from the same deployment's channel catalog,
// cached briefly to avoid hammering the static asset on every root request.
async function getCommittedToken(origin) {
  const now = Date.now();
  if (now - catalogCache.at < CATALOG_TTL_MS) return catalogCache.lb2Url;
  try {
    let lb2Url = null;
    const res = await fetch(origin + CATALOG_URL);
    if (res.ok) {
      const channels = await res.json();
      for (const ch of channels) {
        if (ch && ch.id === CHANNEL && ch.url) {
          lb2Url = ch.url;
          break;
        }
      }
    }
    catalogCache = { at: now, lb2Url };
  } catch (e) {
    catalogCache = { at: now, lb2Url: null };
  }
  return catalogCache.lb2Url;
}

function tokenExpiry(u) {
  try {
    const parts = new URL(u).searchParams.get("token");
    if (!parts) return null;
    const exp = Number(parts.split("-")[parts.split("-").length - 2]);
    return Number.isFinite(exp) ? exp : null;
  } catch (e) {
    return null;
  }
}

function isUnexpired(u) {
  const exp = tokenExpiry(u);
  if (exp === null) return true;
  return exp * 1000 > Date.now();
}

function isPlaylistUrl(u) {
  return /\.m3u8([?#]|$)/i.test(u);
}

function rewritePlaylist(text, baseDir, self) {
  const out = [];
  for (const line of text.split("\n")) {
    const raw = line;
    let l = line;
    if (/^#EXT-X-KEY:/i.test(l)) {
      out.push(l.replace(/URI="([^"]+)"/, (m, uri) => 'URI="' + playUrl(self, resolve(uri, baseDir)) + '"'));
      continue;
    }
    if (/^#EXT-X-MEDIA:/i.test(l) || /^#EXT-X-I-FRAME-STREAM-INF:/i.test(l)) {
      out.push(l.replace(/URI="([^"]+)"/, (m, uri) => 'URI="' + playUrl(self, resolve(uri, baseDir)) + '"'));
      continue;
    }
    if (/^#/.test(l) || !l.trim()) {
      out.push(raw);
      continue;
    }
    const abs = resolve(l.trim(), baseDir);
    const kind = isPlaylistUrl(abs) ? "playlist" : "seg";
    out.push(self + "?channel=" + CHANNEL + "&a=" + kind + "&url=" + encodeURIComponent(abs));
  }
  return out.join("\n");
}

// Build the proxied URL for a variant/segment/URI resource.
// Variant playlists are requested back as playlists (so hls.js follows them),
// plain segment/other URIs are requested as binary segments.
function playUrl(self, abs) {
  const kind = isPlaylistUrl(abs) ? "playlist" : "seg";
  return self + "?channel=" + CHANNEL + "&a=" + kind + "&url=" + encodeURIComponent(abs);
}

function resolve(rel, baseDir) {
  if (/^https?:\/\//i.test(rel)) return rel;
  return baseDir + rel;
}

// Only ever proxy the elahmad LB2 stream directory; everything else is
// rejected so this endpoint cannot be abused as a generic SSRF proxy.
function allowed(target) {
  if (!/^https?:\/\//i.test(target)) return false;
  const p = (function () {
    try {
      return new URL(target).pathname;
    } catch (e) {
      return "";
    }
  })();
  if (!/^\/tv\d+_[^/]*_lb2\//.test(p)) return false;
  return /^(https?:\/\/)?games1\.elahmad\.store\//.test(target);
}

// Detect the placeholder/canary URL elahmad.ru hands automated (datacenter)
// clients. If minted, LB2 is effectively offline for this network right now.
function isDecoy(u) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host === "raw.githubusercontent.com" || /\.githubusercontent\.com$/.test(host);
  } catch (e) {
    return false;
  }
}

// Mint a fresh token from this function's egress IP. The token it returns is
// bound to THIS IP, which is exactly what we need since all upstream fetches
// also leave from this same IP. Returns { master }.
async function mintTokenUrl() {
  const pageRes = await fetch(SOURCE.page, {
    headers: { "User-Agent": UA, Referer: "https://www.elahmad.ru/" },
  });
  const html = await pageRes.text();
  const marker = 'name="csrf-token" content="';
  const i = html.indexOf(marker);
  if (i === -1) throw new Error("Could not read csrf-token from page");
  const csrf = html.slice(i + marker.length).split('"')[0];

  // elahmad.ru ties the csrf token to the PHP session it creates on the page
  // request; the mint POST must echo that session cookie or the server answers
  // {"error":"Invalid Token Error elahmad.ru"}.
  const cookie = (pageRes.headers.get("set-cookie") || "").split(";")[0];

  const resultRes = await fetch(SOURCE.result, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Referer: SOURCE.page,
      Origin: "https://www.elahmad.ru",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
      Cookie: cookie,
    },
    body: SOURCE.post + "&csrf_token=" + encodeURIComponent(csrf),
  });
  const data = await resultRes.json();
  if (!data.link_4) throw new Error("No link_4 in stream endpoint response");

  const ciphertext = b64ToBytes(data.link_4);
  const key = hexToBytes(data.key);
  const iv = hexToBytes(data.iv);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    cryptoKey,
    ciphertext
  );
  const master = new TextDecoder()
    .decode(plain)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]+$/, "");
  if (!/^https:\/\//.test(master)) throw new Error("Minted URL is not HTTP(S)");
  if (isDecoy(master)) {
    const err = new Error(
      "elahmad is serving a placeholder stream for this network right now; LB2 is temporarily unavailable."
    );
    err.isOffline = true;
    throw err;
  }
  return { master };
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function text(msg, status) {
  return new Response(msg, { status: status || 500 });
}