// Mint a fresh signed LB2 master playlist URL and write it into
// index.html (replacing DEFAULT_URL). Run on a schedule from a
// GitHub-hosted runner (non-Cloudflare IP) so elahmad.ru doesn't
// block the request (the Cloudflare Pages function is egress-blocked).
import fs from "node:fs";

const BASE = "https://www.elahmad.ru";
const PAGE = BASE + "/tv/mobiletv/glarb.php?id=lb2";
const RESULT = BASE + "/tv/result/embed_result_elahmad_81.php";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function base64ToBytes(b64) {
  const bin = Buffer.from(b64, "base64").toString("binary");
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

async function mint() {
  const pageRes = await fetch(PAGE, {
    headers: { "User-Agent": UA, Referer: BASE + "/" },
  });
  const html = await pageRes.text();
  const marker = 'name="csrf-token" content="';
  const i = html.indexOf(marker);
  if (i === -1) throw new Error("Could not read csrf-token from page");
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
  if (!data.link_4) throw new Error("No link_4 in response: " + JSON.stringify(data));

  const ciphertext = base64ToBytes(data.link_4);
  const key = hexToBytes(data.key);
  const iv = hexToBytes(data.iv);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ciphertext);
  const url = Buffer.from(plain).toString("utf8").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]+$/, "");
  return url;
}

async function main() {
  const url = await mint();
  const file = "index.html";
  let html = fs.readFileSync(file, "utf8");
  const re = /var DEFAULT_URL = "([^"]+)";/;
  const m = html.match(re);
  if (!m) throw new Error("DEFAULT_URL not found in index.html");
  if (m[1] === url) {
    console.log("Token unchanged, nothing to update.");
    return false;
  }
  // Verify the new URL really serves an HLS playlist BEFORE writing anything,
  // so a dead/403 token (e.g. from a datacenter egress IP) is never committed.
  const check = await fetch(url);
  if (!check.ok) throw new Error("New URL rejected by media server: " + check.status);
  const body = await check.text();
  if (body.trim().indexOf("#EXTM3U") !== 0) {
    throw new Error("New URL is not a valid HLS playlist (status " + check.status + ")");
  }
  html = html.replace(re, 'var DEFAULT_URL = "' + url + '";');
  fs.writeFileSync(file, html);
  console.log("Updated DEFAULT_URL (verified " + check.status + ").");
  return true;
}

main()
  .then((changed) => { process.exit(changed ? 0 : 0); })
  .catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
