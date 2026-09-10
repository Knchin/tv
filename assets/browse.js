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
    initialized: false
  };

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

  function renderChannelList(channels, container) {
    if (!channels || !channels.length) {
      container.innerHTML = '<div class="panel-empty">No channels available</div>';
      return;
    }
    var sorted = channels.slice().sort(function (a, b) {
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

  function updatePanel(iso) {
    var panelBody = document.getElementById("globe-panel-body");
    var panelTitle = document.getElementById("globe-panel-title");
    var panelCount = document.getElementById("globe-panel-count");
    var panelSearch = document.getElementById("globe-panel-search");
    var channels = state.channelsByCountry[iso] || [];
    var name = countryName(iso);

    panelTitle.textContent = name;
    panelCount.textContent = channels.length + " channel" + (channels.length !== 1 ? "s" : "");
    panelSearch.value = "";
    panelSearch.placeholder = "Search " + name + " channels…";
    renderChannelList(channels, panelBody);
  }

  function openPanel(iso) {
    var panel = document.getElementById("globe-panel");
    var countriesBtn = document.getElementById("countries-panel");
    if (!panel) return;
    state.selectedISO = iso;
    state.panelOpen = true;
    updatePanel(iso);
    panel.classList.add("open");
    if (countriesBtn) countriesBtn.classList.remove("active");
    syncPanels();
  }

  function closePanel() {
    var panel = document.getElementById("globe-panel");
    if (!panel) return;
    state.selectedISO = null;
    state.panelOpen = false;
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
    var countries = (window.ChannelData.countries || []).filter(function (c) {
      return c.code && c.code !== "XX" && c.count > 0;
    });
    countries.sort(function (a, b) { return b.count - a.count; });

    var html = '<div class="country-list-search">'
      + '<input type="search" id="country-list-search-input" placeholder="Search countries…" autocomplete="off" spellcheck="false">'
      + '</div>'
      + '<div class="country-list-items" id="country-list-items">';

    countries.forEach(function (c) {
      html += '<button class="country-list-item" data-iso="' + c.code + '">'
        + '<span class="country-list-name">' + c.name + '</span>'
        + '<span class="country-list-count">' + c.count + '</span>'
        + '</button>';
    });

    html += '</div>';
    container.innerHTML = html;

    var items = container.querySelectorAll(".country-list-item");
    items.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var iso = btn.getAttribute("data-iso");
        selectCountry(iso);
        if (window.innerWidth <= 600) toggleCountryList(false);
      });
    });

    var searchInput = document.getElementById("country-list-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.toLowerCase().trim();
        items.forEach(function (item) {
          var name = item.querySelector(".country-list-name").textContent.toLowerCase();
          item.style.display = (!q || name.indexOf(q) !== -1) ? "" : "none";
        });
      });
    }

    // Highlight the selected country
    if (state.selectedISO) {
      container.querySelectorAll(".country-list-item").forEach(function (item) {
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
    if (!query || !query.trim()) {
      closePanel();
      renderCountryList();
      return;
    }
    var q = query.toLowerCase().trim();
    var countries = window.ChannelData.countries || [];
    var matchCountry = null;
    for (var i = 0; i < countries.length; i++) {
      if (countries[i].name.toLowerCase().indexOf(q) !== -1) {
        matchCountry = countries[i];
        break;
      }
    }
    if (matchCountry && matchCountry.code) {
      selectCountry(matchCountry.code);
      return;
    }
    // Search channels and open the country with the most matches
    var channels = window.ChannelData.channels || [];
    var isoCounts = {};
    var any = false;
    channels.forEach(function (ch) {
      var text = (ch.name + " " + ch.country + " " + ch.category + " " + (ch.languages || []).join(" ")).toLowerCase();
      if (text.indexOf(q) !== -1) {
        any = true;
        if (!isoCounts[ch.countryCode]) isoCounts[ch.countryCode] = 0;
        isoCounts[ch.countryCode]++;
      }
    });
    if (any) {
      var bestISO = Object.keys(isoCounts).sort(function (a, b) { return isoCounts[b] - isoCounts[a]; })[0];
      if (bestISO) selectCountry(bestISO);
    }
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

    // Wire panel search (filters channels within the open country)
    var panelSearch = document.getElementById("globe-panel-search");
    if (panelSearch) {
      panelSearch.addEventListener("input", function () {
        var q = this.value.toLowerCase().trim();
        var iso = state.selectedISO;
        if (!iso) return;
        var all = state.channelsByCountry[iso] || [];
        if (!q) {
          renderChannelList(all, document.getElementById("globe-panel-body"));
          return;
        }
        var filtered = all.filter(function (ch) {
          var text = (ch.name + " " + ch.category + " " + (ch.languages || []).join(" ")).toLowerCase();
          return text.indexOf(q) !== -1;
        });
        renderChannelList(filtered, document.getElementById("globe-panel-body"));
      });
    }
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