export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = (url.searchParams.get("id") || "lb2").toLowerCase();

  const SOURCES = {
    lb2: {
      page: "https://www.elahmad.ru/tv/mobiletv/glarb.php?id=lb2",
      result: "https://www.elahmad.ru/tv/result/embed_result_elahmad_81.php",
      post: "id=lb2",
    },
  };

  const source = SOURCES[id];
  if (!source) {
    return json({ url: null, error: "No token source for this channel" }, 200);
  }

  // Prefer the committed (home-minted) token while it is still valid. It was
  // obtained from a residential IP, which is the only network elahmad.ru
  // gives a real LB2 stream to (Cloudflare egress gets a placeholder).
  try {
    const committed = await getCommittedToken(url.origin, id);
    if (committed && isUnexpired(committed)) {
      return json({ url: committed, channel: id });
    }
  } catch (e) {
    // fall through to a fresh server-side mint
  }

  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  try {
    const pageRes = await fetch(source.page, {
      headers: { "User-Agent": UA, Referer: "https://www.elahmad.ru/" },
    });
    const html = await pageRes.text();

    const marker = 'name="csrf-token" content="';
    const i = html.indexOf(marker);
    if (i === -1) {
      return json({ url: null, error: "Could not read csrf-token from page" }, 500);
    }
    const csrf = html.slice(i + marker.length).split('"')[0];

    // The csrf token is bound to the PHP session elahmad.ru created on the
    // page request; echo its cookie or the server rejects the token.
    const cookie = (pageRes.headers.get("set-cookie") || "").split(";")[0];

    const resultRes = await fetch(source.result, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Referer: source.page,
        Origin: "https://www.elahmad.ru",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Cookie: cookie,
      },
      body: source.post + "&csrf_token=" + encodeURIComponent(csrf),
    });
    const data = await resultRes.json();
    if (!data.link_4) {
      return json({ url: null, error: "Unexpected response from stream endpoint" }, 502);
    }

    const tokenUrl = await decrypt(data);
    if (isDecoy(tokenUrl)) {
      return json({ url: null, error: "Stream temporarily unavailable for this network" }, 503);
    }
    return json({ url: tokenUrl, channel: id });
  } catch (e) {
    return json({ url: null, error: String(e && e.message ? e.message : e) }, 500);
  }
}

async function decrypt(data) {
  const ciphertext = base64ToBytes(data.link_4);
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
    { name: "AES-CBC", iv: iv },
    cryptoKey,
    ciphertext
  );
  return new TextDecoder().decode(plain);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Read the committed URL for a channel from the same deployment's catalog.
async function getCommittedToken(origin, id) {
  const res = await fetch(origin + "/assets/channels_canonical.json");
  if (!res.ok) return null;
  const channels = await res.json();
  for (const ch of channels) {
    if (ch && ch.id === id && ch.url) return ch.url;
  }
  return null;
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

// Detect the placeholder/canary URL elahmad.ru hands automated clients.
function isDecoy(u) {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host === "raw.githubusercontent.com" || /\.githubusercontent\.com$/.test(host);
  } catch (e) {
    return false;
  }
}

function base64ToBytes(b64) {
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
