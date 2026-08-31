export async function onRequest(context) {
  const BASE = "https://www.elahmad.ru";
  const PAGE = BASE + "/tv/mobiletv/glarb.php?id=lb2";
  const RESULT = BASE + "/tv/result/embed_result_elahmad_81.php";
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  try {
    const pageRes = await fetch(PAGE, {
      headers: { "User-Agent": UA, Referer: BASE + "/" },
    });
    const html = await pageRes.text();

    const marker = 'name="csrf-token" content="';
    const i = html.indexOf(marker);
    if (i === -1) {
      return json({ error: "Could not read csrf-token from page" }, 500);
    }
    const csrf = html.slice(i + marker.length).split('"')[0];

    const resultRes = await fetch(RESULT, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        Referer: PAGE,
        Origin: BASE,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: "id=lb2&csrf_token=" + encodeURIComponent(csrf),
    });
    const data = await resultRes.json();
    if (!data.link_4) {
      return json({ error: "Unexpected response from stream endpoint" }, 502);
    }

    const url = await decrypt(data);
    return json({ url: url, channel: "lb2" });
  } catch (e) {
    return json({ error: String(e && e.message ? e.message : e) }, 500);
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
