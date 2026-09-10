// LB2 HLS streaming proxy for Cloudflare Pages Functions.
//
// games1.elahmad.store binds its playback tokens to the IP that minted them.
// A token minted from a GitHub runner or a Cloudflare function is therefore
// useless in a visitor's browser — the media server returns 403 to any other
// IP. The only token that can play is one minted from the SAME egress IP that
// requests the playlist/segments.
//
// So instead of handing the minted URL to the browser, this function keeps
// the whole HLS fetch on ONE side — its own egress IP:
//   1. Mint a token here (bound to this function's egress IP).
//   2. Fetch the master playlist, rewrite every variant/segment URL to point
//      back at this same function (/api/stream?channel=lb2&a=...&url=<upstream>).
//   3. For each proxied request, fetch the upstream resource (works, because
//      it is the same IP that minted the token) and stream it through.
// The browser only ever talks to the same-origin function endpoint, so no
// CORS headers are required and no IP trust is placed in the visitor.

const CHANNEL = "lb2";
const SOURCE = {
  page: "https://www.elahmad.ru/tv/mobiletv/glarb.php?id=" + CHANNEL,
  result: "https://www.elahmad.ru/tv/result/embed_result_elahmad_81.php",
  post: "id=" + CHANNEL,
};
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HLS_HEADERS = {
  "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store, max-age=0",
};
const BIN_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store, max-age=0",
};

export async function onRequest(context) {
  const u = new URL(context.request.url);
  const a = u.searchParams.get("a") || "playlist";
  const relUrl = u.searchParams.get("url");
  const self = u.origin + "/api/stream";

  try {
    const { master } = await mintTokenUrl();

    if (a === "seg") {
      if (!relUrl || !allowed(relUrl)) return text("Bad segment URL", 400);
      const r = await fetch(relUrl, { headers: { "User-Agent": UA } });
      const ct = r.headers.get("content-type") || "video/MP2T";
      return new Response(r.body, {
        status: r.status,
        headers: Object.assign({ "Content-Type": ct }, BIN_HEADERS),
      });
    }

    const target = relUrl || master;
    if (!allowed(target)) return text("Bad playlist URL", 400);
    const r = await fetch(target, { headers: { "User-Agent": UA } });
    if (!r.ok) return text("Upstream " + target.split("/")[2] + ": " + r.status, 502);
    const body = await r.text();
    // Relative URIs inside a playlist resolve against THAT playlist's own
    // directory (the variant lives in tracks-v1a1/, the master at the root).
    const baseDir = target.slice(0, target.lastIndexOf("/") + 1);
    return new Response(rewritePlaylist(body, baseDir, self), {
      status: 200,
      headers: HLS_HEADERS,
    });
  } catch (e) {
    return text("Proxy error: " + String((e && e.message) || e), 500);
  }
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
    const kind = /\.m3u8([?#]|$)/i.test(abs) ? (abs.includes("?") ? "playlist" : "playlist") : "seg";
    out.push(self + "?channel=" + CHANNEL + "&a=" + kind + "&url=" + encodeURIComponent(abs));
  }
  return out.join("\n");
}

// Build the proxied URL for a variant/segment/URI resource.
// Variant playlists are requested back as playlists (so hls.js follows them),
// plain segment/other URIs are requested as binary segments.
function playUrl(self, abs) {
  const kind = /\.m3u8([?#]|$)/i.test(abs) ? "playlist" : "seg";
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

// Mint a fresh token from this function's egress IP. The token it returns is
// bound to THIS IP, which is exactly what we need since all upstream fetches
// also leave from this same IP. Returns { master, token }.
async function mintTokenUrl() {
  const pageRes = await fetch(SOURCE.page, {
    headers: { "User-Agent": UA, Referer: "https://www.elahmad.ru/" },
  });
  const html = await pageRes.text();
  const marker = 'name="csrf-token" content="';
  const i = html.indexOf(marker);
  if (i === -1) throw new Error("Could not read csrf-token from page");
  const csrf = html.slice(i + marker.length).split('"')[0];

  const resultRes = await fetch(SOURCE.result, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      Referer: SOURCE.page,
      Origin: "https://www.elahmad.ru",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
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