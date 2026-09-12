// Centralized channel data layer
// Single source of truth for all channel metadata

// Country codes mapping (ISO 3166-1 alpha-2)
const COUNTRY_CODES = {
  'Afghanistan': 'AF',
  'Algeria': 'DZ',
  'Argentina': 'AR',
  'Australia': 'AU',
  'Austria': 'AT',
  'Bahrain': 'BH',
  'Bangladesh': 'BD',
  'Belgium': 'BE',
  'Bolivia': 'BO',
  'Bosnia and Herzegovina': 'BA',
  'Brazil': 'BR',
  'Bulgaria': 'BG',
  'Burkina Faso': 'BF',
  'Cambodia': 'KH',
  'Cameroon': 'CM',
  'Canada': 'CA',
  'Cape Verde': 'CV',
  'Chad': 'TD',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Costa Rica': 'CR',
  'Croatia': 'HR',
  'Cyprus': 'CY',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Dominican Republic': 'DO',
  'DR Congo': 'CD',
  'Ecuador': 'EC',
  'Egypt': 'EG',
  'El Salvador': 'SV',
  'Eritrea': 'ER',
  'Estonia': 'EE',
  'Ethiopia': 'ET',
  'Finland': 'FI',
  'France': 'FR',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Guatemala': 'GT',
  'Guinea': 'GN',
  'Honduras': 'HN',
  'Hong Kong': 'HK',
  'Hungary': 'HU',
  'India': 'IN',
  'Indonesia': 'ID',
  'Iran': 'IR',
  'Iraq': 'IQ',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Ivory Coast': 'CI',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kazakhstan': 'KZ',
  'Kenya': 'KE',
  'Kuwait': 'KW',
  'Laos': 'LA',
  'Lebanon': 'LB',
  'Libya': 'LY',
  'Luxembourg': 'LU',
  'Malaysia': 'MY',
  'Mali': 'ML',
  'Malta': 'MT',
  'Mexico': 'MX',
  'Morocco': 'MA',
  'Mongolia': 'MN',
  'Morocco': 'MA',
  'Myanmar': 'MM',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Niger': 'NE',
  'Nigeria': 'NG',
  'North Macedonia': 'MK',
  'Norway': 'NO',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Palestine': 'PS',
  'Panama': 'PA',
  'Paraguay': 'PY',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Russia': 'RU',
  'Saudi Arabia': 'SA',
  'Senegal': 'SN',
  'Serbia': 'RS',
  'Singapore': 'SG',
  'Slovakia': 'SK',
  'Slovenia': 'SI',
  'Somalia': 'SO',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'Spain': 'ES',
  'Sri Lanka': 'LK',
  'Sudan': 'SD',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Syria': 'SY',
  'Taiwan': 'TW',
  'Tanzania': 'TZ',
  'Thailand': 'TH',
  'Tunisia': 'TN',
  'Turkey': 'TR',
  'UAE': 'AE',
  'Uganda': 'UG',
  'Ukraine': 'UA',
  'United Kingdom': 'GB',
  'United States': 'US',
  'Uruguay': 'UY',
  'Uzbekistan': 'UZ',
  'Vietnam': 'VN',
  'Western Sahara': 'EH',
  'Yemen': 'YE',
  'Zambia': 'ZM',
  'Zimbabwe': 'ZW',
  'Other': 'XX'
};

// Category definitions
const CATEGORIES = {
  news: { name: 'News', icon: '📰', order: 1 },
  sports: { name: 'Sports', icon: '⚽', order: 2 },
  entertainment: { name: 'Entertainment', icon: '🎭', order: 3 },
  movies: { name: 'Movies', icon: '🎬', order: 4 },
  kids: { name: 'Kids', icon: '🧸', order: 5 },
  music: { name: 'Music', icon: '🎵', order: 6 },
  documentary: { name: 'Documentary', icon: '📺', order: 7 },
  religious: { name: 'Religious', icon: '⛪', order: 8 },
  general: { name: 'General', icon: '📺', order: 9 },
  music: { name: 'Music', icon: '🎵', order: 6 },
  kids: { name: 'Kids', icon: '🧸', order: 5 },
  entertainment: { name: 'Entertainment', icon: '🎭', order: 3 },
  sports: { name: 'Sports', icon: '⚽', order: 2 },
  news: { name: 'News', icon: '📰', order: 1 },
};

// Slugify function for generating stable, human-readable URLs
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Trim hyphens from start/end
}

// Generate unique slug with collision handling
function generateUniqueSlug(name, existingSlugs) {
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  existingSlugs.add(slug);
  return slug;
}

// Infer category from channel name/description
function inferCategory(name, description = '') {
  const text = `${name} ${description}`.toLowerCase();
  
  if (text.includes('news') || text.includes('24') || text.includes('breaking')) return 'news';
  if (text.includes('sport') || text.includes('football') || text.includes('cricket') || 
      text.includes('tennis') || text.includes('fifa') || text.includes('uefa')) return 'sports';
  if (text.includes('movie') || text.includes('cinema') || text.includes('film')) return 'movies';
  if (text.includes('kid') || text.includes('cartoon') || text.includes('disney') || 
      text.includes('nick') || text.includes('boomerang')) return 'kids';
  if (text.includes('music') || text.includes('mtv') || text.includes('viva') || 
      text.includes('hits') || text.includes('radio')) return 'music';
  if (text.includes('documentary') || text.includes('discovery') || text.includes('natgeo') ||
      text.includes('history') || text.includes('science')) return 'documentary';
  if (text.includes('kids') || text.includes('baby') || text.includes('toddler')) return 'kids';
  if (text.includes('religious') || text.includes('church') || text.includes('faith') ||
      text.includes('islam') || text.includes('christian') || text.includes('quran') ||
      text.includes('bible') || text.includes('prayer')) return 'religious';
  if (text.includes('music') || text.includes('song') || text.includes('concert')) return 'music';
  
  return 'general';
}

// Parse country from description field
function parseCountry(description) {
  if (!description) return 'Other';
  const parts = description.split(' - ');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return 'Other';
}

// Build channel data from raw channels - supports both old format (parse from description) and new format (explicit fields)
function buildChannelData(rawChannels) {
  const existingSlugs = new Set();
  const channels = [];
  
  for (const raw of rawChannels) {
    // Support both old format (parse from description) and new format (explicit fields)
    const country = raw.country || parseCountry(raw.description);
    const countryCode = raw.countryCode || COUNTRY_CODES[country] || 'XX';
    const category = raw.category || inferCategory(raw.name, raw.description);
    const slug = raw.slug || generateUniqueSlug(raw.name, existingSlugs);
    
    channels.push({
      id: raw.id,
      name: raw.name,
      slug: slug,
      country: country,
      countryCode: countryCode,
      category: category,
      type: raw.type,
      url: raw.url,
      languages: raw.languages || [],
      isGeoBlocked: raw.isGeoBlocked || false,
      logo: null, // Can be populated later
      isFavorite: false,
      lastWatched: null,
      createdAt: Date.now()
    });
  }
  
  return channels;
}

// Get all unique countries from channels
function getCountries(channels) {
  const countryMap = new Map();
  
  for (const channel of channels) {
    const existing = countryMap.get(channel.country) || { count: 0, code: channel.countryCode };
    countryMap.set(channel.country, {
      count: existing.count + 1,
      code: existing.code
    });
  }
  
  return Array.from(countryMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Get all unique categories from channels
function getCategories(channels) {
  const categoryMap = new Map();
  
  for (const channel of channels) {
    const existing = categoryMap.get(channel.category) || { count: 0 };
    categoryMap.set(channel.category, { count: existing.count + 1 });
  }
  
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({ name, count: data.count }))
    .sort((a, b) => b.count - a.count); // Sort by popularity
}

// ---- Enhanced search (accent-insensitive, tokenized, fuzzy, ranked) ----

// Lowercase + strip diacritics (Ã© -> e, TÃ¼rkiye -> turkiye).
function normalizeText(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a, b) {
  if (a === b) return 0;
  var la = a.length, lb = b.length;
  if (!la) return lb;
  if (!lb) return la;
  var prev = new Array(lb + 1);
  var curr = new Array(lb + 1);
  var i, j;
  for (j = 0; j <= lb; j++) prev[j] = j;
  for (i = 1; i <= la; i++) {
    curr[0] = i;
    for (j = 1; j <= lb; j++) {
      var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    var t = prev; prev = curr; curr = t;
  }
  return prev[lb];
}

// Score one normalized token against normalized text (1 = exact, 0 = no match).
// Exact whole-field and prefix wins, then substring, then Levenshtein-tolerant
// word matching (typos, matching only for tokens of length >= 4).
function tokenScore(token, text) {
  if (!token || !text) return 0;
  if (text === token) return 1;
  if (text.indexOf(token) === 0) return 0.92;
  if (text.indexOf(token) !== -1) return 0.85;
  var best = 0;
  var words = text.split(/\s+/);
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (!word || word === token) continue;
    if (token.length >= 4 && Math.abs(word.length - token.length) <= 2) {
      var d = levenshtein(word, token);
      if (d <= 1) best = Math.max(best, 0.75);
      else if (d <= 2 && word.length >= 5) best = Math.max(best, 0.55);
    }
  }
  return best;
}

// Common alternate spellings / codes for catalog country names.
var COUNTRY_SEARCH_ALIASES = {
  'usa': 'United States', 'america': 'United States', 'us': 'United States',
  'uae': 'UAE', 'ksa': 'Saudi Arabia', 'saudi': 'Saudi Arabia',
  'uk': 'United Kingdom', 'england': 'United Kingdom', 'britain': 'United Kingdom', 'gb': 'United Kingdom',
  'turkey': 'Turkiye', 'liban': 'Lebanon', 'misr': 'Egypt', 'maroc': 'Morocco',
  'magyar': 'Hungary', 'españa': 'Spain', 'espana': 'Spain', 'deutschland': 'Germany',
  'oesterreich': 'Austria', 'suomi': 'Finland', 'sverige': 'Sweden', 'nederland': 'Netherlands',
  'belgique': 'Belgium', 'polska': 'Poland', 'schweiz': 'Switzerland', 'helvetia': 'Switzerland',
  'southkorea': 'South Korea', 'taikorea': 'South Korea', 'sokor': 'South Korea',
  'palestine': 'Palestine', 'palestina': 'Palestine', 'philippines': 'Philippines',
  'vietnam': 'Vietnam', 'viet nam': 'Vietnam', 'azeri': 'Azerbaijan',
  'el salvador': 'El Salvador', 'bosnia': 'Bosnia and Herzegovina',
  'hongkong': 'Hong Kong', 'south africa': 'South Africa', 'sa': 'South Africa'
};
var COUNTRY_ALIAS_NORM = {};
Object.keys(COUNTRY_SEARCH_ALIASES).forEach(function (key) {
  COUNTRY_ALIAS_NORM[normalizeText(key)] = normalizeText(COUNTRY_SEARCH_ALIASES[key]);
});

// Ranked channel search. Returns channels where EVERY query token matches at
// least one field (name / country / countryCode / category / languages),
// ordered by relevance (name matches weigh most).
function searchChannels(channels, query) {
  if (!query || !query.trim()) return channels;
  var tokens = normalizeText(query).split(/\s+/).filter(function (t) { return t.length > 0; });
  if (!tokens.length) return channels;
  var scored = [];

  for (var i = 0; i < channels.length; i++) {
    var ch = channels[i];
    var aliasHit = COUNTRY_ALIAS_NORM[tokens.length === 1 ? tokens[0] : ''] || '';
    var nName = normalizeText(ch.name);
    var nCur = normalizeText(ch.country);
    var nCode = normalizeText(ch.countryCode);
    var nCat = normalizeText(ch.category);
    var nLang = normalizeText((ch.languages || []).join(' '));

    var total = 0;
    var matchedAll = true;
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      var best = Math.max(
        tokenScore(tok, nName) * 3,
        tokenScore(tok, nCur) * 2,
        tokenScore(tok, nCode) * 1.2,
        tokenScore(tok, nCat) * 1,
        tokenScore(tok, nLang) * 1
      );
      // alias country match: token is an alias key and channel.country is the mapped name
      var alias = COUNTRY_ALIAS_NORM[tok];
      if (alias && nCur === alias) {
        best = Math.max(best, 1.8);
      }
      if (best === 0) { matchedAll = false; break; }
      total += best;
    }
    if (matchedAll) {
      scored.push({ channel: ch, score: total });
    }
  }

  scored.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return a.channel.name.localeCompare(b.channel.name);
  });
  return scored.map(function (s) { return s.channel; });
}

// Ranked country search over the aggregated country list. Matches name,
// ISO code and common aliases; accent-insensitive.
function searchCountries(query) {
  var countries = window.ChannelData && window.ChannelData.countries ? window.ChannelData.countries : [];
  if (!query || !query.trim()) {
    return countries.slice().filter(function (c) { return c.code && c.code !== 'XX'; })
      .sort(function (a, b) { return a.name.localeCompare(b.name); });
  }
  var tokens = normalizeText(query).split(/\s+/).filter(function (t) { return t.length > 0; });
  if (!tokens.length) return countries.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  var scored = [];

  for (var i = 0; i < countries.length; i++) {
    var c = countries[i];
    if (c.code === 'XX') continue;
    if (!normalizeText(c.name)) continue;
    var total = 0;
    var matchedAll = true;
    for (var t = 0; t < tokens.length; t++) {
      var tok = tokens[t];
      var nName = normalizeText(c.name);
      var nCode = normalizeText(c.code);
      var best = Math.max(
        tokenScore(tok, nName) * 2,
        tokenScore(tok, nCode) * 1.5
      );
      if (nCode === tok) best = Math.max(best, 2);
      var alias = COUNTRY_ALIAS_NORM[tok];
      if (alias && nName === alias) best = Math.max(best, 2);
      if (best === 0) { matchedAll = false; break; }
      total += best;
    }
    if (matchedAll) scored.push({ country: c, score: total });
  }

  scored.sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return b.country.count - a.country.count;
  });
  return scored.map(function (s) {
    var c = s.country;
    var copy = {};
    for (var k in c) {
      if (Object.prototype.hasOwnProperty.call(c, k)) copy[k] = c[k];
    }
    copy.score = s.score;
    return copy;
  });
}

// Filter channels by country
function filterByCountry(channels, country) {
  if (!country || country === 'all') return channels;
  return channels.filter(c => c.country === country);
}

// Filter channels by category
function filterByCategory(channels, category) {
  if (!category || category === 'all') return channels;
  return channels.filter(c => c.category === category);
}

// Combined filter
function filterChannels(channels, { search = '', country = 'all', category = 'all' } = {}) {
  let results = channels;
  
  if (search) results = searchChannels(results, search);
  if (country !== 'all') results = filterByCountry(results, country);
  if (category !== 'all') results = filterByCategory(results, category);
  
  return results;
}

// Export all functions and data
window.ChannelData = {
  COUNTRY_CODES,
  CATEGORIES,
  slugify,
  generateUniqueSlug,
  inferCategory,
  parseCountry,
  buildChannelData,
  getCountries,
  getCategories,
  normalizeText,
  searchChannels,
  searchCountries,
  filterByCountry,
  filterByCategory,
  filterChannels
};

// Initialize synchronously - window.CHANNELS should be available since channels.js loads first with defer
function initializeChannelData() {
  // Load raw channels from the existing channels array
  const rawChannels = window.CHANNELS || [];
  const channels = buildChannelData(rawChannels);
  
  // Expose processed channels
  window.ChannelData.channels = channels;
  window.ChannelData.countries = getCountries(channels);
  window.ChannelData.categories = getCategories(channels);
  
  // Helper to find channel by slug or id
  window.ChannelData.findBySlug = (slug) => channels.find(c => c.slug === slug);
  window.ChannelData.findById = (id) => channels.find(c => c.id === id);
  window.ChannelData.getAll = () => channels;
  window.ChannelData.searchAllChannels = (query, base) => searchChannels(base || channels, query);
  
  // Dispatch event to notify that data is ready
  window.dispatchEvent(new CustomEvent('channeldata:ready'));
}

// Initialize synchronously with a small delay to ensure window.CHANNELS is fully parsed
// Since channels.js loads first with defer, it should be ready, but add a tiny delay as safety
if (window.CHANNELS && window.CHANNELS.length > 0) {
  initializeChannelData();
} else {
  // Fallback: wait for CHANNELS to be populated
  const checkInterval = setInterval(() => {
    if (window.CHANNELS && window.CHANNELS.length > 0) {
      clearInterval(checkInterval);
      initializeChannelData();
    }
  }, 10);
  
  setTimeout(() => {
    clearInterval(checkInterval);
    if (!window.ChannelData || !window.ChannelData.channels || window.ChannelData.channels.length === 0) {
      initializeChannelData();
    }
  }, 100);
}
