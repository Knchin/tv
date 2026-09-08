import fs from "node:fs";
import crypto from "node:crypto";

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseM3U(content) {
  const lines = content.split("\n");
  const channels = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      const attrs = {};
      const extinf = line.slice(8);
      const attrRegex = /(\w+)="([^"]*)"/g;
      let match;
      while ((match = attrRegex.exec(extinf)) !== null) {
        attrs[match[1]] = match[2];
      }
      const nameMatch = extinf.match(/,([^,]+)$/);
      const name = nameMatch ? nameMatch[1].trim() : "";
      current = { name, ...attrs };
    } else if (line && !line.startsWith("#") && current) {
      channels.push({
        id: current["tvg-id"] || slugify(current.name),
        name: current.name,
        logo: current["tvg-logo"] || "",
        category: current["group-title"] || "general",
        url: line.trim(),
        country: "",
        countryCode: "",
        languages: [],
        isGeoBlocked: false,
        description: "",
      });
      current = null;
    }
  }
  return channels;
}

function loadExistingChannels() {
  const code = fs.readFileSync("assets/channels.js", "utf8");
  const match = code.match(/window\.CHANNELS\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) throw new Error("Could not find CHANNELS array");
  // Use Function to safely evaluate the array literal
  const CHANNELS = Function("return " + match[1])();
  return CHANNELS;
}

async function fetchIptvOrgMetadata() {
  const res = await fetch("https://iptv-org.github.io/api/channels.json");
  return await res.json();
}

function getCountryFromTvgId(tvgId) {
  const match = tvgId.match(/\.([a-z]{2})@/i);
  return match ? match[1].toUpperCase() : "";
}

function getCountryCode(country) {
  const map = {
    "United States": "US",
    "United Kingdom": "GB",
    "Germany": "DE",
    "France": "FR",
    "Italy": "IT",
    "Spain": "ES",
    "Portugal": "PT",
    "Netherlands": "NL",
    "Belgium": "BE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Poland": "PL",
    "Russia": "RU",
    "Ukraine": "UA",
    "Turkey": "TR",
    "Canada": "CA",
    "Australia": "AU",
    "Brazil": "BR",
    "Mexico": "MX",
    "Argentina": "AR",
    "India": "IN",
    "China": "CN",
    "Japan": "JP",
    "South Korea": "KR",
    "Hong Kong": "HK",
    "Taiwan": "TW",
    "Singapore": "SG",
    "Thailand": "TH",
    "Vietnam": "VN",
    "Indonesia": "ID",
    "Philippines": "PH",
    "Malaysia": "MY",
    "Israel": "IL",
    "Saudi Arabia": "SA",
    "United Arab Emirates": "AE",
    "Qatar": "QA",
    "Kuwait": "KW",
    "Bahrain": "BH",
    "Oman": "OM",
    "Egypt": "EG",
    "South Africa": "ZA",
    "Nigeria": "NG",
    "Kenya": "KE",
    "Ghana": "GH",
    "Morocco": "MA",
    "Algeria": "DZ",
    "Tunisia": "TN",
    "Lebanon": "LB",
    "Jordan": "JO",
    "Iraq": "IQ",
    "Iran": "IR",
    "Pakistan": "PK",
    "Bangladesh": "BD",
    "Sri Lanka": "LK",
    "Nepal": "NP",
    "Afghanistan": "AF",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Finland": "FI",
    "Ireland": "IE",
    "Czech Republic": "CZ",
    "Slovakia": "SK",
    "Hungary": "HU",
    "Romania": "RO",
    "Bulgaria": "BG",
    "Greece": "GR",
    "Croatia": "HR",
    "Serbia": "RS",
    "Slovenia": "SI",
    "Lithuania": "LT",
    "Latvia": "LV",
    "Estonia": "EE",
    "New Zealand": "NZ",
  };
  return map[country] || "";
}

async function main() {
  console.log("Loading existing channels...");
  const existing = loadExistingChannels();
  console.log(`Existing: ${existing.length} channels`);

  const existingById = new Map(existing.map(c => [c.id, c]));
  const existingByUrl = new Map(existing.map(c => [c.url, c]));

  console.log("Fetching iptv-org metadata...");
  const iptvMeta = await fetchIptvOrgMetadata();
  const metaById = new Map(iptvMeta.map(c => [c.id, c]));

  console.log("Parsing M3U...");
  const m3uContent = fs.readFileSync("/tmp/iptv_full.m3u", "utf8");
  const m3uChannels = parseM3U(m3uContent);
  console.log(`Parsed ${m3uChannels.length} channels from M3U`);

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const mc of m3uChannels) {
    const meta = metaById.get(mc.id);
    const existingMatch = existingById.get(mc.id) || existingByUrl.get(mc.url);

    let country = meta?.country || getCountryFromTvgId(mc.id);
    let countryCode = meta?.country || getCountryCode(country) || (meta?.country ? meta.country.toLowerCase() : "");
    if (countryCode.length === 2) countryCode = countryCode.toLowerCase();

    const categories = meta?.categories || (mc.category ? [mc.category.toLowerCase()] : ["general"]);
    const primaryCategory = categories[0];

    const channelData = {
      id: mc.id,
      name: mc.name,
      description: "",
      type: "hls",
      url: mc.url,
      slug: slugify(mc.name),
      country: meta?.country || country || "Unknown",
      countryCode: countryCode,
      category: primaryCategory,
      languages: meta?.languages || [],
      isGeoBlocked: false,
      logo: mc.logo,
    };

    if (existingMatch) {
      const idx = existing.indexOf(existingMatch);
      if (idx !== -1) {
        existing[idx] = { ...existingMatch, ...channelData };
        updated++;
      }
    } else {
      existing.push(channelData);
      added++;
    }
  }

  console.log(`Added: ${added}, Updated: ${updated}, Total: ${existing.length}`);

  const code = fs.readFileSync("assets/channels.js", "utf8");
  const newChannelsJs = code.replace(
    /window\.CHANNELS\s*=\s*\[[\s\S]*?\];/,
    "window.CHANNELS = " + JSON.stringify(existing, null, 2) + ";"
  );
  fs.writeFileSync("assets/channels.js", newChannelsJs);

  const canonical = existing.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    country: c.country,
    country_code: c.countryCode,
    countryCode: c.countryCode,
    category: c.category,
    type: c.type,
    url: c.url,
    languages: c.languages,
    isGeoBlocked: c.isGeoBlocked,
    description: c.description,
  }));
  fs.writeFileSync("assets/channels_canonical.json", JSON.stringify(canonical, null, 0));

  console.log("Written assets/channels.js and assets/channels_canonical.json");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});