// Home page application logic
(function () {
  // DOM Elements
  const grid = document.getElementById("channel-grid");
  const alphaNavEl = document.getElementById("alpha-nav");
  const searchToggle = document.getElementById("search-toggle");
  const searchFilterBar = document.getElementById("search-filter-bar");
  const searchInput = document.getElementById("search-input");
  const searchClear = document.getElementById("search-clear");
  const countryFilter = document.getElementById("country-filter");
  const categoryFilter = document.getElementById("category-filter");
  const resultsInfo = document.getElementById("results-info");
  const resultsCount = document.getElementById("results-count");
  const clearFilters = document.getElementById("clear-filters");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const noResults = document.getElementById("no-results");
  const alphaNavEl = document.getElementById("alpha-nav");
  const recentlyWatchedGrid = document.getElementById("recently-watched-grid");
  const favoritesGrid = document.getElementById("favorites-grid");
  const recentlyWatchedSection = document.getElementById("recently-watched");
  const favoritesSection = document.getElementById("favorites");
  const noResultsEl = document.getElementById("no-results");
  const resultsInfoEl = document.getElementById("results-info");
  const resultsCountEl = document.getElementById("results-count");
  const countryFilterEl = document.getElementById("country-filter");
  const categoryFilterEl = document.getElementById("category-filter");
  const recentlyWatchedSectionEl = document.getElementById("recently-watched");
  const favoritesSectionEl = document.getElementById("favorites");
  const allChannelsSection = document.getElementById("all-channels");
  const searchToggle = document.getElementById("search-toggle");
  const searchFilterBarEl = document.getElementById("search-filter-bar");
  const searchInputEl = document.getElementById("search-input");
  const searchClearBtn = document.getElementById("search-clear");
  const clearFiltersEl = document.getElementById("clear-filters");
  const recentlyWatchedGridEl = document.getElementById("recently-watched-grid");
  const favoritesGridEl = document.getElementById("favorites-grid");
  const noResultsEl2 = document.getElementById("no-results");

  // State
  let allChannels = [];
  let filteredChannels = [];
  let currentFilters = { search: '', country: 'all', category: 'all' };
  let searchDebounceTimer = null;
  let isSearchOpen = false;
  let dataLayerReady = false;

  // Initialize
  function init() {
    // Load channels from data layer
    allChannels = window.ChannelData.getAll() || [];
    
    // Populate filters
    populateFilters();
    
    // Render initial state
    renderRecentlyWatched();
    renderFavorites();
    renderAllChannels();
    buildAlphaNav();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load persisted data
    loadPersistedData();
  }

  // Wait for data layer to be ready
  function waitForDataLayer() {
    if (window.ChannelData && window.ChannelData.channels && window.ChannelData.channels.length > 0) {
      init();
      return;
    }
    
    // Wait for channeldata:ready event
    window.addEventListener('channeldata:ready', function onDataReady() {
      window.removeEventListener('channeldata:ready', onDataReady);
      init();
    });
    
    // Fallback: check periodically
    const checkInterval = setInterval(() => {
      if (window.ChannelData && window.ChannelData.channels && window.ChannelData.channels.length > 0) {
        clearInterval(checkInterval);
        init();
      }
    }, 50);
    
    // Fallback timeout
    setTimeout(() => {
      clearInterval(checkInterval);
      // Try anyway with whatever we have
      init();
    }, 5000);
  }

  // Initialize
  waitForDataLayer();

  function populateFilters() {
    // Populate country filter
    const countries = window.ChannelData.countries || [];
    countryFilterEl.innerHTML = '<option value="all">All Countries</option>';
    countries.forEach(country => {
      const option = document.createElement('option');
      option.value = country.name;
      option.textContent = `${country.name} (${country.count})`;
      countryFilterEl.appendChild(option);
    });

    // Populate category filter
    const categories = window.ChannelData.categories || [];
    categoryFilterEl.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      option.textContent = `${cat.name} (${cat.count})`;
      categoryFilterEl.appendChild(option);
    });
  }

  function buildAlphaNav() {
    const letters = ["#"].concat("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
    alphaNavEl.innerHTML = '';
    
    letters.forEach(letter => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = letter;
      btn.setAttribute("data-letter", letter);
      btn.setAttribute("aria-label", "Jump to " + (letter === "#" ? "numbers/symbols" : letter));
      btn.addEventListener("click", function () {
        const targetId = "country-" + (letter === "#" ? "other" : letter.toLowerCase());
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      alphaNavEl.appendChild(btn);
    });
  }

  function renderChannels(channels, container, options) {
    if (!container) return;
    
    if (!channels.length) {
      container.innerHTML = '<p style="color:#8fa5c7; text-align: center; padding: 20px;">No channels available.</p>';
      return;
    }

    const { showCountry = true, showCategory = true, maxItems } = options || {};
    
    container.innerHTML = '';
    const channelsToRender = maxItems ? channels.slice(0, maxItems) : channels;
    
    channelsToRender.forEach(c => {
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
          '<div class="channel-logo-placeholder">' + c.name.charAt(0) + '</div>' +
        "</div>" +
        '<div class="channel-info">' +
          "<h2>" + escapeHtml(c.name) + "</h2>" +
          "<p>" + (showCountry ? escapeHtml(c.country) : '') + (showCountry && showCategory ? ' · ' : '') + (showCategory ? escapeHtml(c.category) : '') + "</p>" +
        "</div>" +
        '<div class="channel-actions">' +
          '<button class="fav-btn" data-channel-id="' + c.id + '" aria-label="' + (isFav ? 'Remove from favorites' : 'Add to favorites') + '">' + favIcon + '</button>' +
          '<span class="channel-cta">Watch Live →</span>' +
        '</div>';

      container.appendChild(card);
    });

    container.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(btn.dataset.channelId);
      });
    });
  }

  function renderAllChannels() {
    filteredChannels = window.ChannelData.filterChannels(allChannels, currentFilters);
    renderChannels(filteredChannels, grid);
    buildCountrySections();
    buildAlphaNav();
    
    updateResultsInfo();
  }

  function buildCountrySections() {
    const byCountry = {};
    filteredChannels.forEach(c => {
      if (!byCountry[c.country]) byCountry[c.country] = [];
      byCountry[c.country].push(c);
    });

    const sortedCountries = Object.keys(byCountry).sort();
    grid.innerHTML = '';
    const sectionIds = [];

    sortedCountries.forEach(country => {
      const countryChannels = byCountry[country];
      const firstChar = country.charAt(0).toUpperCase();
      const letterGroup = /^[A-Z]$/.test(firstChar) ? firstChar : "#";
      const sectionId = "country-" + (letterGroup === "#" ? "other" : letterGroup.toLowerCase());
      
      const section = document.createElement("div");
      section.className = "country-section";
      section.id = sectionId;

      const header = document.createElement("div");
      header.className = "country-header";
      header.innerHTML =
        '<h2>' + escapeHtml(country) + '</h2>' +
        '<span class="count">' + countryChannels.length + ' channel' + (countryChannels.length > 1 ? 's' : '') + '</span>';
      section.appendChild(header);

      const countryGrid = document.createElement("div");
      countryGrid.className = "channel-grid";
      countryChannels.forEach(c => {
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
            '<div class="channel-logo-placeholder">' + c.name.charAt(0) + '</div>' +
          "</div>" +
          '<div class="channel-info">' +
            "<h2>" + escapeHtml(c.name) + "</h2>" +
            "<p>" + escapeHtml(c.country) + ' · ' + escapeHtml(c.category) + "</p>" +
          "</div>" +
          '<div class="channel-actions">' +
            '<button class="fav-btn" data-channel-id="' + c.id + '" aria-label="' + (isFav ? 'Remove from favorites' : 'Add to favorites') + '">' + favIcon + '</button>' +
            '<span class="channel-cta">Watch Live →</span>' +
          '</div>';

        countryGrid.appendChild(card);
      });
      section.appendChild(countryGrid);
      grid.appendChild(section);
      
      sectionIds.push({ id: sectionId, letter: firstChar });
    });

    grid.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(btn.dataset.channelId);
      });
    });

    setupScrollSpy(sectionIds);
  }

  function setupScrollSpy(sectionIds) {
    const alphaButtons = alphaNavEl.querySelectorAll("button[data-letter]");
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const letter = entry.target.dataset.letterGroup;
        if (!letter) return;
        const btn = alphaNavEl.querySelector('button[data-letter="' + letter + '"]');
        if (btn) {
          if (entry.isIntersecting) {
            btn.classList.add("active");
          } else {
            btn.classList.remove("active");
          }
        }
      });
    }, { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 });

    sectionIds.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) {
        el.dataset.letterGroup = s.letter;
        observer.observe(el);
      });
    });
  }

  function renderRecentlyWatched() {
    const recent = getRecentlyWatched();
    if (recent.length === 0) {
      recentlyWatchedSectionEl.hidden = true;
      return;
    }
    recentlyWatchedSectionEl.hidden = false;
    renderChannels(recent, recentlyWatchedGridEl, { maxItems: 10, showCountry: true, showCategory: true });
  }

  function renderFavorites() {
    const favs = getFavorites();
    if (favs.length === 0) {
      favoritesSectionEl.hidden = true;
      return;
    }
    favoritesSectionEl.hidden = false;
    renderChannels(favs, favoritesGridEl, { showCountry: true, showCategory: true });
  }

  function updateResultsInfo() {
    const count = filteredChannels.length;
    resultsCountEl.textContent = count;
    resultsInfoEl.hidden = (currentFilters.search === '' && currentFilters.country === 'all' && currentFilters.category === 'all');
    noResultsEl.hidden = count > 0;
    allChannelsSection.hidden = count === 0 && (currentFilters.search || currentFilters.country !== 'all' || currentFilters.category !== 'all');
    
    const hasFilters = currentFilters.search || currentFilters.country !== 'all' || currentFilters.category !== 'all';
    clearFiltersBtn.hidden = !hasFilters;
  }

  function applyFilters() {
    filteredChannels = window.ChannelData.filterChannels(allChannels, currentFilters);
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

    document.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.fav-btn');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.channelId);
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

    document.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.fav-btn');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.channelId);
      }
    });

    let currentChannelIndex = -1;
    
    function getChannelIndex(slug) {
      return allChannels.findIndex(c => c.slug === slug);
    }

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
        const index = parseInt(e.key) - 1;
        if (index < filteredChannels.length) {
          window.location.href = '/channel/' + encodeURIComponent(filteredChannels[index].slug) + '/';
        }
      }
    );

    waitForDataLayer();
  })();
</script>

<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function (err) {
        console.error("SW registration failed:", err);
      });
    });
  }
</script>
</body>
</html>