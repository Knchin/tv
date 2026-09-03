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

// Search channels with fuzzy matching
function searchChannels(channels, query) {
  if (!query || !query.trim()) return channels;
  
  const normalizedQuery = query.toLowerCase().trim();
  const terms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  
  return channels.filter(channel => {
    const searchableText = `${channel.name} ${channel.country} ${channel.category} ${channel.languages.join(' ')}`.toLowerCase();
    return terms.every(term => searchableText.includes(term));
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
  searchChannels,
  filterByCountry,
  filterByCategory,
  filterChannels
};

// Build and expose channels when DOM is ready
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
}

// Initialize when DOM is ready (ensures window.CHANNELS is defined)
// Initialize when DOM is ready (ensures window.CHANNELS is defined)
function waitForChannelsAndInit() {
  if (window.CHANNELS && window.CHANNELS.length > 0) {
    initializeChannelData();
  } else {
    // Wait for CHANNELS to be defined - check immediately first
    if (window.CHANNELS && window.CHANNELS.length > 0) {
      initializeChannelData();
      return;
    }
    // Wait for CHANNELS to be defined - poll with longer interval
    const checkInterval = setInterval(() => {
      if (window.CHANNELS && window.CHANNELS.length > 0) {
        clearInterval(checkInterval);
        initializeChannelData();
      }
    }, 100);
    
    // Fallback timeout - try anyway after 3 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      initializeChannelData();
    }, 3000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForChannelsAndInit);
} else {
  waitForChannelsAndInit();
}