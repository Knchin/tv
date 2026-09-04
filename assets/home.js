// Home page application logic
(function () {
  // DOM Elements
  const grid = document.getElementById("channel-grid");
  const searchToggle = document.getElementById("search-toggle");
  const searchFilterBar = document.getElementById("search-filter-bar");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const countryFilterEl = document.getElementById("country-filter");
  const categoryFilterEl = document.getElementById("category-filter");
  const resultsInfoEl = document.getElementById("results-info");
  const resultsCountEl = document.getElementById("results-count");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const noResultsEl = document.getElementById("no-results");
  const recentlyWatchedGridEl = document.getElementById("recently-watched-grid");
  const favoritesGridEl = document.getElementById("favorites-grid");
  const recentlyWatchedSectionEl = document.getElementById("recently-watched");
  const favoritesSectionEl = document.getElementById("favorites");
  const allChannelsSection = document.getElementById("all-channels");
  const searchFilterBarEl = document.getElementById("search-filter-bar");
  const searchInputEl = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("search-clear");
  const paginationEl = document.getElementById("pagination");
  const pagePrevBtn = document.getElementById("page-prev");
  const pageNextBtn = document.getElementById("page-next");
  const pageNumbersEl = document.getElementById("page-numbers");

  // State
  let allChannels = [];
  let filteredChannels = [];
  let currentFilters = { search: '', country: 'all', category: 'all' };
  let searchDebounceTimer = null;
  let isSearchOpen = false;
  const PAGE_SIZE = 18; // 6 per line x 3 lines
  let currentPage = 1;

  // Initialize
  function init() {
    allChannels = window.ChannelData.getAll() || [];

    populateFilters();
    renderRecentlyWatched();
    renderFavorites();
    renderAllChannels();

    setupEventListeners();
    loadPersistedData();
  }

  // Wait for data layer to be ready
  function waitForDataLayer() {
    if (window.ChannelData && window.ChannelData.channels && window.ChannelData.channels.length > 0) {
      init();
      return;
    }

    const onDataReady = function () {
      window.removeEventListener('channeldata:ready', onDataReady);
      init();
    };
    window.addEventListener('channeldata:ready', onDataReady);

    const checkInterval = setInterval(() => {
      if (window.ChannelData && window.ChannelData.channels && window.ChannelData.channels.length > 0) {
        clearInterval(checkInterval);
        init();
      }
    }, 50);

    setTimeout(() => {
      clearInterval(checkInterval);
      init();
    }, 5000);
  }

  // Initialize
  waitForDataLayer();

  function populateFilters() {
    const countries = window.ChannelData.countries || [];
    countryFilterEl.innerHTML = '<option value="all">All Countries</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.name;
      option.textContent = country.name + ' (' + country.count + ')';
      countryFilterEl.appendChild(option);
    });

    const categories = window.ChannelData.categories || [];
    categoryFilterEl.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = cat.name + ' (' + cat.count + ')';
      categoryFilterEl.appendChild(option);
    });
  }

  function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function buildCard(c) {
    const card = document.createElement("a");
    card.className = "channel-card";
    card.href = "/channel/" + encodeURIComponent(c.slug) + "/";
    card.setAttribute("aria-label", "Watch " + c.name);
    card.dataset.channelId = c.id;
    card.dataset.channelSlug = c.slug;

    const isFav = isFavorite(c.id);
    const favIcon = isFav
      ? '<svg class="fav-icon active" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>'
      : '<svg class="fav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';

    card.innerHTML =
      '<div class="channel-thumb">' +
        '<span class="badge"><span class="dot"></span> LIVE</span>' +
        '<div class="channel-logo-placeholder">' + escapeHtml(c.name.charAt(0)) + '</div>' +
      "</div>" +
      '<div class="channel-info">' +
        "<h2>" + escapeHtml(c.name) + "</h2>" +
      "</div>" +
      '<div class="channel-actions">' +
        '<button class="fav-btn" data-channel-id="' + eid(c.id) + '" aria-label="' + (isFav ? 'Remove from favorites' : 'Add to favorites') + '">' + favIcon + '</button>' +
        '<span class="channel-cta"><svg class="play-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg></span>' +
      '</div>';

    return card;
  }

  function eid(id) {
    return typeof id === 'string' ? id.replace(/"/g, '&quot;') : id;
  }

  function attachFavHandlers(container) {
    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(btn.dataset.channelId);
      });
    });
  }

  function renderChannels(channels, container, options) {
    if (!container) return;

    if (!channels.length) {
      container.innerHTML = '<p style="color:#8fa5c7; text-align:center; padding:20px;">No channels available.</p>';
      return;
    }

    const { showCountry = true, showCategory = true, maxItems } = options || {};

    container.innerHTML = '';
    const channelsToRender = maxItems ? channels.slice(0, maxItems) : channels;

    channelsToRender.forEach(c => {
      const card = buildCard(c);
      if (showCountry || showCategory) {
        const p = document.createElement("p");
        p.textContent = (showCountry ? c.country : '') + (showCountry && showCategory ? ' · ' : '') + (showCategory ? c.category : '');
        card.querySelector('.channel-info').appendChild(p);
      }
      container.appendChild(card);
    });

    attachFavHandlers(container);
  }

  function renderAllChannels() {
    filteredChannels = window.ChannelData.filterChannels(allChannels, currentFilters);
    filteredChannels = filteredChannels.slice().sort((a, b) => a.name.localeCompare(b.name));
    const totalPages = Math.max(1, Math.ceil(filteredChannels.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageChannels = filteredChannels.slice(start, start + PAGE_SIZE);
    renderChannels(pageChannels, grid, { showCountry: true, showCategory: true });
    renderPagination(totalPages);
    updateResultsInfo();
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) {
      paginationEl.hidden = true;
      return;
    }
    paginationEl.hidden = false;
    pagePrevBtn.disabled = currentPage <= 1;
    pageNextBtn.disabled = currentPage >= totalPages;

    pageNumbersEl.innerHTML = "";
    var pages = pageWindow(currentPage, totalPages);
    pages.forEach(function (p, idx) {
      if (p === "…") {
        var dots = document.createElement("span");
        dots.className = "page-dots";
        if (idx > 0 && pages[idx - 1] === "…") return;
        dots.textContent = "…";
        pageNumbersEl.appendChild(dots);
        return;
      }
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "page-num" + (p === currentPage ? " active" : "");
      btn.textContent = p;
      btn.setAttribute("aria-label", "Go to page " + p);
      if (p !== currentPage) {
        btn.setAttribute("aria-current", "false");
      } else {
        btn.setAttribute("aria-current", "page");
      }
      btn.addEventListener("click", function () {
        currentPage = p;
        renderAllChannels();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      pageNumbersEl.appendChild(btn);
    });
  }

  function pageWindow(current, total) {
    if (total <= 7) {
      var all = [];
      for (var i = 1; i <= total; i++) all.push(i);
      return all;
    }
    var pages = [];
    var left = Math.max(2, current - 1);
    var right = Math.min(total - 1, current + 1);
    if (left > 2) pages.push("…");
    for (var p = left; p <= right; p++) pages.push(p);
    if (right < total - 1) pages.push("…");
    return [1].concat(pages, [total]);
  }

  function renderRecentlyWatched() {
    const recent = getRecentlyWatched();
    if (!recent.length) {
      recentlyWatchedSectionEl.hidden = true;
      return;
    }
    recentlyWatchedSectionEl.hidden = false;
    renderChannels(recent, recentlyWatchedGridEl, { maxItems: 10, showCountry: true, showCategory: true });
  }

  function renderFavorites() {
    const favs = getFavorites();
    if (!favs.length) {
      favoritesSectionEl.hidden = true;
      return;
    }
    favoritesSectionEl.hidden = false;
    renderChannels(favs, favoritesGridEl, { showCountry: true, showCategory: true });
  }

  function updateResultsInfo() {
    const count = filteredChannels.length;
    resultsCountEl.textContent = count;
    const hasFilters = currentFilters.search || currentFilters.country !== 'all' || currentFilters.category !== 'all';
    resultsInfoEl.hidden = !hasFilters;
    noResultsEl.hidden = count > 0;
    allChannelsSection.hidden = count === 0 && hasFilters;
    clearFiltersBtn.hidden = !hasFilters;
  }

  function applyFilters() {
    filteredChannels = window.ChannelData.filterChannels(allChannels, currentFilters);
    currentPage = 1;
    renderAllChannels();
  }

  function setupEventListeners() {
    searchToggle.addEventListener('click', () => {
      isSearchOpen = !isSearchOpen;
      searchFilterBarEl.hidden = !isSearchOpen;
      searchToggle.setAttribute('aria-expanded', isSearchOpen);
      if (isSearchOpen) {
        searchInputEl.focus();
      }
    });

    searchInputEl.addEventListener('input', (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentFilters.search = e.target.value.trim();
        searchClearBtn.hidden = !currentFilters.search;
        applyFilters();
      }, 150);
    });

    searchClearBtn.addEventListener('click', () => {
      searchInputEl.value = '';
      currentFilters.search = '';
      searchClearBtn.hidden = true;
      applyFilters();
    });

    countryFilterEl.addEventListener('change', (e) => {
      currentFilters.country = e.target.value;
      applyFilters();
    });

    categoryFilterEl.addEventListener('change', (e) => {
      currentFilters.category = e.target.value;
      applyFilters();
    });

    clearFiltersBtn.addEventListener('click', () => {
      currentFilters = { search: '', country: 'all', category: 'all' };
      searchInputEl.value = '';
      countryFilterEl.value = 'all';
      categoryFilterEl.value = 'all';
      searchClearBtn.hidden = true;
      applyFilters();
    });

    pagePrevBtn.addEventListener('click', () => {
      if (currentPage > 1) { currentPage -= 1; renderAllChannels(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });

    pageNextBtn.addEventListener('click', () => {
      currentPage += 1; renderAllChannels(); window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.fav-btn');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.channelId);
      }
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.channel-card');
      if (card && card.dataset.channelSlug) {
        addToRecentlyWatched(card.dataset.channelId);
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isSearchOpen) {
          isSearchOpen = true;
          searchFilterBarEl.hidden = false;
          searchToggle.setAttribute('aria-expanded', true);
          searchInputEl.focus();
        }
      }

      if (e.key === 'Escape') {
        if (isSearchOpen) {
          isSearchOpen = false;
          searchFilterBarEl.hidden = true;
          searchToggle.setAttribute('aria-expanded', false);
          searchInputEl.blur();
        }
      }
    });

    let currentChannelIndex = -1;

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.key === 'ArrowUp') {
          currentChannelIndex = Math.max(0, currentChannelIndex - 1);
        } else {
          currentChannelIndex = Math.min(allChannels.length - 1, currentChannelIndex + 1);
        }
        const channel = allChannels[currentChannelIndex];
        if (channel) {
          window.location.href = '/channel/' + encodeURIComponent(channel.slug) + '/';
        }
      }

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        if (index < filteredChannels.length) {
          window.location.href = '/channel/' + encodeURIComponent(filteredChannels[index].slug) + '/';
        }
      }
    });
  }

  // Persistence functions
  function getFavorites() {
    try {
      const stored = localStorage.getItem('tv-favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  function isFavorite(channelId) {
    return getFavorites().some(f => f.id === channelId);
  }

  function toggleFavorite(channelId) {
    const channel = allChannels.find(c => c.id === channelId);
    if (!channel) return;

    const favs = getFavorites();
    const index = favs.findIndex(f => f.id === channelId);

    if (index >= 0) {
      favs.splice(index, 1);
    } else {
      favs.unshift({ id: channelId, name: channel.name, slug: channel.slug, addedAt: Date.now() });
    }

    localStorage.setItem('tv-favorites', JSON.stringify(favs));

    renderAllChannels();
    renderFavorites();
    renderRecentlyWatched();
  }

  function getRecentlyWatched() {
    try {
      const stored = localStorage.getItem('tv-recent');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  }

  function addToRecentlyWatched(channelId) {
    const channel = allChannels.find(c => c.id === channelId);
    if (!channel) return;

    let recent = getRecentlyWatched();
    recent = recent.filter(r => r.id !== channelId);
    recent.unshift({ id: channelId, name: channel.name, slug: channel.slug, watchedAt: Date.now() });
    recent = recent.slice(0, 20);

    localStorage.setItem('tv-recent', JSON.stringify(recent));
    renderRecentlyWatched();
  }

  function loadPersistedData() {
    try {
      const lastChannel = localStorage.getItem('tv-last-channel');
      if (lastChannel) {
        // Could auto-play or show suggestion
      }
    } catch (e) {}
  }
})();