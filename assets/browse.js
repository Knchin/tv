// Tfarraj Browse — countries -> channels -> player.
// The principal home page: left menu lists countries, the right panel lists
// that country's channels, and clicking a channel mounts the live player in
// the center area. No map libraries needed.

(function () {
  "use strict";

  var state = {
    channelsByCountry: {},
    selectedISO: null,
    panelOpen: false,
    initialized: false,
    countryList: [],
    panelMode: 'country', // 'country' | 'results'
    panelResults: [],
    panelQuery: '',
    searchTimer: null
  };

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = String(text == null ? "" : text);
    return div.innerHTML;
  }

  function countryName(iso) {
    var countries = window.ChannelData.countries || [];
    for (var i = 0; i < countries.length; i++) {
      if (countries[i].code === iso) return countries[i].name;
    }
    return iso;
  }

  function syncPanels() {
    var canvas = document.getElementById("globe-canvas");
    if (!canvas) return;
    var list = document.getElementById("globe-countries-list");
    var panel = document.getElementById("globe-panel");
    canvas.setAttribute("data-left", list && list.classList.contains("open") ? "open" : "closed");
    canvas.setAttribute("data-right", panel && panel.classList.contains("open") ? "open" : "closed");
  }

  function buildCountryIndex() {
    var channels = window.ChannelData.channels || [];
    var byISO = {};
    channels.forEach(function (ch) {
      var iso = ch.countryCode;
      if (!iso || iso === "XX") return;
      if (!byISO[iso]) byISO[iso] = [];
      byISO[iso].push(ch);
    });
    state.channelsByCountry = byISO;
  }

  // ---- Right channel panel --------------------------------------------

  function channelCardHTML(channel) {
    var categoryTag = channel.category && channel.category !== "general"
      ? '<span class="channel-tag">' + channel.category + '</span>'
      : '';
    return '<button type="button" class="globe-channel-card" data-id="' + channel.id + '" title="' + channel.name + '">'
      + '<div class="globe-channel-info">'
      +   '<div class="globe-channel-name">' + channel.name + '</div>'
      +   '<div class="globe-channel-meta">'
      +     (channel.country ? '<span class="channel-country">' + channel.country + '</span>' : '')
      +     categoryTag
      +   '</div>'
      + '</div>'
      + '<div class="globe-channel-live"><span class="live-dot"></span><span class="live-text">LIVE</span></div>'
      + '</button>';
  }

  function renderChannelList(channels, container, keepOrder) {
    if (!channels || !channels.length) {
      container.innerHTML = '<div class="panel-empty">No channels found</div>';
      return;
    }
    var sorted = keepOrder ? channels : channels.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    var html = '<div class="globe-channel-list">';
    sorted.forEach(function (ch) { html += channelCardHTML(ch); });
    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".globe-channel-card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-id");
        if (!id) return;
        var channels = window.ChannelData.channels || [];
        var ch = null;
        for (var i = 0; i < channels.length; i++) {
          if (channels[i].id === id) { ch = channels[i]; break; }
        }
        if (ch) openChannel(ch);
      });
    });
  }

  function updatePanel(opts) {
    var panelBody = document.getElementById("globe-panel-body");
    var panelTitle = document.getElementById("globe-panel-title");
    var panelCount = document.getElementById("globe-panel-count");
    var panelSearch = document.getElementById("globe-panel-search");
    if (!panelBody || !panelTitle || !panelCount) return;
    var channels = opts.channels || [];
    panelTitle.textContent = opts.title || "";
    panelCount.textContent = opts.countLabel !== undefined
      ? opts.countLabel
      : channels.length + " channel" + (channels.length !== 1 ? "s" : "");
    if (panelSearch) {
      panelSearch.placeholder = opts.placeholder || "Search channels…";
      if (opts.clearSearch) panelSearch.value = "";
    }
    renderChannelList(channels, panelBody, !!opts.keepOrder);
  }

  function renderCountryPanel(iso) {
    var name = countryName(iso);
    state.panelMode = "country";
    state.selectedISO = iso;
    state.panelQuery = "";
    var channels = state.channelsByCountry[iso] || [];
    state.panelResults = channels.slice();
    updatePanel({
      channels: channels,
      title: name,
      countLabel: channels.length + " channel" + (channels.length !== 1 ? "s" : ""),
      placeholder: "Search " + name + " channels…",
      clearSearch: true
    });
  }

  function renderResultsPanel(query) {
    var results = window.ChannelData.searchAllChannels(query);
    state.panelMode = "results";
    state.panelQuery = query;
    state.panelResults = results.slice();
    updatePanel({
      channels: results.slice(0, 250),
      title: 'Results for "' + query + '"',
      countLabel: results.length + " channel" + (results.length !== 1 ? "s" : ""),
      placeholder: "Filter results…",
      keepOrder: true,
      clearSearch: true
    });
  }

  function openPanel(iso) {
    var panel = document.getElementById("globe-panel");
    var countriesBtn = document.getElementById("countries-panel");
    if (!panel) return;
    state.panelOpen = true;
    renderCountryPanel(iso);
    panel.classList.add("open");
    if (countriesBtn) countriesBtn.classList.remove("active");
    syncPanels();
  }

  function closePanel() {
    var panel = document.getElementById("globe-panel");
    if (!panel) return;
    state.selectedISO = null;
    state.panelOpen = false;
    state.panelMode = "country";
    state.panelQuery = "";
    state.panelResults = [];
    panel.classList.remove("open");
    syncPanels();
  }

  // ---- Left countries menu --------------------------------------------

  function toggleCountryList(force) {
    var list = document.getElementById("globe-countries-list");
    var countriesBtn = document.getElementById("countries-panel");
    if (!list) return;
    if (force === true) {
      list.classList.add("open");
      if (countriesBtn) countriesBtn.classList.add("active");
      syncPanels();
      return;
    }
    if (force === false) {
      list.classList.remove("open");
      if (countriesBtn) countriesBtn.classList.remove("active");
      syncPanels();
      return;
    }
    var isOpen = list.classList.contains("open");
    if (isOpen) {
      list.classList.remove("open");
      if (countriesBtn) countriesBtn.classList.remove("active");
    } else {
      closePanel();
      list.classList.add("open");
      if (countriesBtn) countriesBtn.classList.add("active");
      renderCountryList();
    }
    syncPanels();
  }

  function renderCountryList() {
    var container = document.getElementById("globe-countries-list-body");
    if (!container) return;

    var html = '<div class="country-list-search">'
      + '<input type="search" id="country-list-search-input" placeholder="Search countries…" autocomplete="off" spellcheck="false">'
      + '</div>'
      + '<div class="country-list-items" id="country-list-items"></div>';
    container.innerHTML = html;

    renderIntoCountryItems("");

    var searchInput = document.getElementById("country-list-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        renderIntoCountryItems(this.value.trim());
      });
    }
  }

  function renderIntoCountryItems(q) {
    var itemsBox = document.getElementById("country-list-items");
    if (!itemsBox) return;
    var filtered = window.ChannelData.searchCountries(q);

    if (!filtered.length) {
      itemsBox.innerHTML = '<div class="panel-empty">No countries match "' + escapeHtml(q) + '"</div>';
      return;
    }

    var html = "";
    filtered.forEach(function (c) {
      html += '<button class="country-list-item" data-iso="' + c.code + '">'
        + '<span class="country-list-name">' + c.name + '</span>'
        + '<span class="country-list-count">' + c.count + '</span>'
        + '</button>';
    });
    itemsBox.innerHTML = html;

    itemsBox.querySelectorAll(".country-list-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var iso = btn.getAttribute("data-iso");
        selectCountry(iso);
        if (window.innerWidth <= 600) toggleCountryList(false);
      });
    });

    if (state.selectedISO) {
      itemsBox.querySelectorAll(".country-list-item").forEach(function (item) {
        item.classList.toggle("active", item.getAttribute("data-iso") === state.selectedISO);
      });
    }
  }

  // ---- Selection -------------------------------------------------------

  function selectCountry(iso) {
    if (!iso) return;
    state.selectedISO = iso;
    openPanel(iso);
    // Refresh highlighting in the (already rendered) country list
    var container = document.getElementById("globe-countries-list-body");
    if (container) {
      container.querySelectorAll(".country-list-item").forEach(function (item) {
        item.classList.toggle("active", item.getAttribute("data-iso") === iso);
      });
    }
  }

  function openChannel(channel) {
    var canvas = document.getElementById("globe-canvas");
    if (!canvas) return;
    if (window.TfarrajPlayer) {
      window.TfarrajPlayer.mount(canvas, channel);
    } else {
      canvas.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff8f9a;font-size:14px">Player not loaded yet — try again in a moment.</div>';
    }
  }

  // ---- Center placeholder ---------------------------------------------

  function showPlaceholder() {
    var canvas = document.getElementById("globe-canvas");
    if (!canvas) return;
    canvas.innerHTML =
      '<div class="browse-placeholder">'
      + '<div class="browse-placeholder-icon">▶</div>'
      + '<p class="browse-placeholder-title">Pick a country, then a channel</p>'
      + '<p class="browse-placeholder-sub">Choose a country from the list on the left, select any channel, and it will play right here.</p>'
      + '</div>';
  }

  // ---- Global header search -------------------------------------------

  function onGlobalSearch(query) {
    var q = query ? query.trim() : "";
    if (!q) {
      if (state.searchTimer) { clearTimeout(state.searchTimer); state.searchTimer = null; }
      closePanel();
      renderCountryList();
      return;
    }
    if (state.searchTimer) clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(function () {
      state.searchTimer = null;
      dispatchGlobalSearch(q);
    }, 140);
  }

  function dispatchGlobalSearch(q) {
    var ranked = window.ChannelData.searchCountries(q);
    var top = ranked.length ? ranked[0] : null;
    var qlen = q.length;
    var codeExact = false;
    if (top && qlen <= 2) {
      var qCode = q.toUpperCase();
      codeExact = String(top.code).toUpperCase() === qCode;
    }
    var isCountry =
      !!top &&
      qlen > 1 &&
      (
        // full / prefix / alias match (or exact ISO code via 'us' etc.)
        (top.score >= 1.84) ||
        // explicit 2-letter country code
        (codeExact && top.score >= 1.5) ||
        // longer queries that clearly describe a country (full/prefix/alias)
        (qlen >= 3 && top.score >= 1.8)
      );
    if (isCountry) {
      // Query clearly identifies a country (name / ISO code / common alias)
      selectCountry(top.code);
      return;
    }
    // Otherwise: ranked channel results across the whole catalog
    openResultsPanel(q);
  }

  function openResultsPanel(q) {
    var panel = document.getElementById("globe-panel");
    if (!panel) return;
    state.panelOpen = true;
    renderResultsPanel(q);
    panel.classList.add("open");
    syncPanels();
  }

  // ---- Init -------------------------------------------------------------

  function init() {
    if (!window.ChannelData || !window.ChannelData.channels) return;
    if (state.initialized) return;
    state.initialized = true;

    buildCountryIndex();
    renderCountryList();
    showPlaceholder();

    // Left menu open by default on desktop; on small screens the header
    // Countries button reveals it.
    if (window.innerWidth > 600) {
      var list = document.getElementById("globe-countries-list");
      var countriesBtn = document.getElementById("countries-panel");
      if (list) list.classList.add("open");
      if (countriesBtn) countriesBtn.classList.add("active");
    }
    syncPanels();

    // Clicking the player / placeholder area (anything outside the two
    // panels and the header) closes the menus so the player takes the
    // full size again.
    var canvas = document.getElementById("globe-canvas");
    if (canvas) {
      canvas.addEventListener("click", function () {
        var list = document.getElementById("globe-countries-list");
        var panel = document.getElementById("globe-panel");
        var leftOpen = list && list.classList.contains("open");
        var rightOpen = panel && panel.classList.contains("open");
        if (leftOpen) toggleCountryList(false);
        if (rightOpen) closePanel();
      });
    }

    // Wire header search
    var searchInput = document.getElementById("globe-search-input");
    var searchClear = document.getElementById("globe-search-clear");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        searchClear.hidden = !this.value;
        onGlobalSearch(this.value);
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { this.value = ""; searchClear.hidden = true; onGlobalSearch(""); }
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", function () {
        searchInput.value = ""; this.hidden = true; searchInput.focus();
        onGlobalSearch("");
      });
    }

    // Wire countries panel toggle
    var countriesBtn = document.getElementById("countries-panel");
    if (countriesBtn) {
      countriesBtn.addEventListener("click", function () {
        toggleCountryList();
      });
    }
    var countriesClose = document.getElementById("countries-list-close");
    if (countriesClose) {
      countriesClose.addEventListener("click", function () {
        toggleCountryList(false);
      });
    }

    // Wire panel close
    var panelClose = document.getElementById("panel-close");
    if (panelClose) {
      panelClose.addEventListener("click", function () {
        closePanel();
      });
    }

    // Wire panel search (filters within the open country, or within the
    // current results set) using the ranked, accent-insensitive search.
    var panelSearch = document.getElementById("globe-panel-search");
    if (panelSearch) {
      panelSearch.addEventListener("input", function () {
        var q = this.value.trim();
        var base = state.panelMode === "results"
          ? state.panelResults
          : state.channelsByCountry[state.selectedISO] || [];
        var filtered = q
          ? window.ChannelData.searchChannels(base, q)
          : base;
        var isCountry = state.panelMode !== "results";
        updatePanel({
          channels: isCountry ? q ? filtered.slice(0, 250) : filtered : filtered.slice(0, 250),
          title: isCountry ? countryName(state.selectedISO) : 'Results for "' + (state.panelQuery || "") + '"',
          countLabel: filtered.length + " channel" + (filtered.length !== 1 ? "s" : ""),
          placeholder: isCountry
            ? "Search " + countryName(state.selectedISO) + " channels…"
            : "Filter results…",
          keepOrder: !!q
        });
      });
    }

    // Ctrl/Cmd+K focuses the header search
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        var si = document.getElementById("globe-search-input");
        if (si) { si.focus(); si.select(); }
      }
    });
  }

  window.TfarrajBrowse = {
    init: init,
    selectCountry: selectCountry,
    openChannel: openChannel,
    closePanel: closePanel,
    onSearch: onGlobalSearch,
    toggleCountryList: toggleCountryList,
    state: state
  };
})();