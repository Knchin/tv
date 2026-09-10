// Tfarraj World Map — 2D interactive map (Leaflet + OpenStreetMap/CARTO)
// Replaces the 3D globe: heavier WebGL/CDN deps were unreachable from some
// networks, so this uses Leaflet raster tiles from jsdelivr + OSM/CARTO.
// Consumes existing window.ChannelData — no separate data source.

(function () {
  "use strict";

  // Numeric ISO ID → Alpha-2 (world-atlas uses numeric ids)
  var NUM_TO_ISO = {
    "004":"AF","008":"AL","012":"DZ","016":"AS","020":"AD","024":"AO",
    "028":"AG","031":"AZ","032":"AR","036":"AU","040":"AT","044":"BS",
    "048":"BH","050":"BD","051":"AM","052":"BB","056":"BE","064":"BT",
    "068":"BO","070":"BA","072":"BW","076":"BR","084":"BZ","090":"SB",
    "096":"BN","100":"BG","104":"MM","108":"BI","112":"BY","116":"KH",
    "120":"CM","124":"CA","132":"CV","140":"CF","144":"LK","148":"TD",
    "152":"CL","156":"CN","158":"TW","170":"CO","174":"KM","178":"CG",
    "180":"CD","188":"CR","191":"HR","192":"CU","196":"CY","203":"CZ",
    "204":"BJ","208":"DK","214":"DO","218":"EC","222":"SV","226":"GQ",
    "231":"ET","232":"ER","233":"EE","238":"FK","242":"FJ","246":"FI",
    "250":"FR","258":"PF","262":"DJ","266":"GA","268":"GE","270":"GM",
    "275":"PS","276":"DE","288":"GH","292":"GI","300":"GR","304":"GL",
    "308":"GD","320":"GT","324":"GN","328":"GY","332":"HT","340":"HN",
    "344":"HK","348":"HU","352":"IS","356":"IN","360":"ID","364":"IR",
    "368":"IQ","372":"IE","376":"IL","380":"IT","384":"CI","388":"JM",
    "392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP","410":"KR",
    "414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","428":"LV",
    "430":"LR","434":"LY","440":"LT","442":"LU","450":"MG","454":"MW",
    "458":"MY","462":"MV","466":"ML","470":"MT","478":"MR","480":"MU",
    "484":"MX","492":"MC","496":"MN","498":"MD","499":"ME","504":"MA",
    "508":"MZ","512":"OM","516":"NA","524":"NP","528":"NL","540":"NC",
    "548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","570":"NU",
    "578":"NO","580":"MP","583":"FM","584":"MH","585":"PW","586":"PK",
    "591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","616":"PL",
    "620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","642":"RO",
    "643":"RU","646":"RW","654":"SH","659":"KN","662":"LC","666":"PM",
    "670":"VC","678":"ST","682":"SA","686":"SN","688":"RS","690":"SC",
    "694":"SL","702":"SG","703":"SK","704":"VN","705":"SI","706":"SO",
    "710":"ZA","716":"ZW","724":"ES","728":"SS","732":"EH","740":"SR",
    "748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ","764":"TH",
    "768":"TG","776":"TO","780":"TT","784":"AE","788":"TN","792":"TR",
    "795":"TM","796":"TC","800":"UG","804":"UA","807":"MK","818":"EG",
    "826":"GB","834":"TZ","840":"US","854":"BF","858":"UY","860":"UZ",
    "862":"VE","876":"WF","882":"WS","887":"YE","894":"ZM",
    "010":"AQ","074":"BV","162":"CX","260":"GF","334":"HM","633":"BL",
    "660":"AN","736":"SD","772":"TK","833":"IM","831":"GG","832":"JE",
    "-99":null
  };

  var state = {
    map: null,
    features: [],          // GeoJSON features
    channelsByCountry: {}, // ISO alpha-2 → [channel, ...]
    countryCounts: {},     // ISO alpha-2 → count
    isoLayers: {},         // ISO alpha-2 → Leaflet layer
    selectedISO: null,
    hoverISO: null,
    panelOpen: false,
    initialized: false
  };

  // ── Group existing channels by country code ────────────────────────
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
    var counts = {};
    Object.keys(byISO).forEach(function (iso) { counts[iso] = byISO[iso].length; });
    state.countryCounts = counts;
  }

  // ── Country name lookup (ISO → name) ──────────────────────────────
  function countryName(iso) {
    var countries = window.ChannelData.countries || [];
    for (var i = 0; i < countries.length; i++) {
      if (countries[i].code === iso) return countries[i].name;
    }
    return iso;
  }

  // ── Get ISO from a feature ─────────────────────────────────────────
  function featureISO(feature) {
    return NUM_TO_ISO[String(feature.id)] || null;
  }

  // ── Channel card HTML (reuses existing channel info) ───────────────
  function channelCardHTML(channel) {
    var liveIndicator = '<span class="live-dot"></span><span class="live-text">LIVE</span>';
    var categoryTag = channel.category && channel.category !== "general"
      ? '<span class="channel-tag">' + channel.category + '</span>'
      : '';
    return '<a class="globe-channel-card" href="/channel/' + channel.slug + '/" title="' + channel.name + '">'
      + '<div class="globe-channel-info">'
      +   '<div class="globe-channel-name">' + channel.name + '</div>'
      +   '<div class="globe-channel-meta">'
      +     (channel.country ? '<span class="channel-country">' + channel.country + '</span>' : '')
      +     categoryTag
      +   '</div>'
      + '</div>'
      + '<div class="globe-channel-live">' + liveIndicator + '</div>'
      + '</a>';
  }

  // ── Update the channel panel content ───────────────────────────────
  function renderChannelList(channels, container) {
    if (!channels.length) {
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
  }

  function updatePanel(iso) {
    var panel = document.getElementById("globe-panel");
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

  // ── Panel open / close ─────────────────────────────────────────────
  function openPanel(iso) {
    var panel = document.getElementById("globe-panel");
    var countriesBtn = document.getElementById("countries-panel");
    if (!panel) return;
    state.selectedISO = iso;
    state.panelOpen = true;
    updatePanel(iso);
    panel.classList.add("open");
    if (countriesBtn) countriesBtn.classList.remove("active");
  }

  function closePanel() {
    var panel = document.getElementById("globe-panel");
    if (!panel) return;
    state.selectedISO = null;
    state.panelOpen = false;
    panel.classList.remove("open");
  }

  // ── Country list sidebar ───────────────────────────────────────────
  function toggleCountryList() {
    var countriesPanel = document.getElementById("globe-countries-list");
    var countriesBtn = document.getElementById("countries-panel");
    if (!countriesPanel) return;
    var isOpen = countriesPanel.classList.contains("open");
    if (isOpen) {
      countriesPanel.classList.remove("open");
      if (countriesBtn) countriesBtn.classList.remove("active");
    } else {
      closePanel();
      countriesPanel.classList.add("open");
      if (countriesBtn) countriesBtn.classList.add("active");
      renderCountryList();
    }
  }

  function renderCountryList() {
    var container = document.getElementById("globe-countries-list-body");
    if (!container) return;
    var countries = window.ChannelData.countries || [];
    var withChannels = countries.filter(function (c) { return c.code !== "XX" && c.count > 0; });
    withChannels.sort(function (a, b) { return b.count - a.count; });

    var html = '<div class="country-list-search">'
      + '<input type="search" id="country-list-search-input" placeholder="Search countries…" autocomplete="off" spellcheck="false">'
      + '</div>'
      + '<div class="country-list-items" id="country-list-items">';

    withChannels.forEach(function (c) {
      html += '<button class="country-list-item" data-iso="' + c.code + '">'
        + '<span class="country-list-name">' + c.name + '</span>'
        + '<span class="country-list-count">' + c.count + '</span>'
        + '</button>';
    });

    html += '</div>';
    container.innerHTML = html;

    var searchInput = document.getElementById("country-list-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        var q = this.value.toLowerCase().trim();
        var items = container.querySelectorAll(".country-list-item");
        items.forEach(function (item) {
          var name = item.querySelector(".country-list-name").textContent.toLowerCase();
          item.style.display = (!q || name.indexOf(q) !== -1) ? "" : "none";
        });
      });
    }

    container.querySelectorAll(".country-list-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var iso = this.getAttribute("data-iso");
        selectCountry(iso);
        var countriesPanel = document.getElementById("globe-countries-list");
        if (countriesPanel) countriesPanel.classList.remove("open");
        var countriesBtn = document.getElementById("countries-panel");
        if (countriesBtn) countriesBtn.classList.remove("active");
      });
    });
  }

  // ── Select a country (click or list) ───────────────────────────────
  function selectCountry(iso) {
    if (!iso || !state.map) return;
    state.selectedISO = iso;
    openPanel(iso);

    var layer = state.isoLayers[iso];
    if (layer) {
      state.map.flyToBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 6,
        duration: 0.8
      });
    } else {
      state.map.setView([20, 10], 4);
    }
  }

  // ── Layer color helpers ────────────────────────────────────────────
  function fillColorFor(feature) {
    var iso = featureISO(feature);
    var count = state.countryCounts[iso] || 0;
    if (iso === state.selectedISO) return "#0ad1ff";
    if (iso === state.hoverISO) return "#0685b4";
    if (count > 0) return "#0a6f96";
    return "#17223c";
  }

  function applyStyles(layer) {
    layer.setStyle({
      fillColor: fillColorFor(layer.feature),
      color: "#0b1b33",
      weight: 0.6,
      fillOpacity: 0.55
    });
  }

  // ── Initialize map ─────────────────────────────────────────────────
  function initMap() {
    var container = document.getElementById("globe-canvas");
    if (!container) return;

    buildCountryIndex();

    var map = L.map(container, {
      zoomControl: false,
      attributionControl: true,
      maxZoom: 8
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    var geoLayer = L.geoJSON(state.features, {
      style: function (feature) { return {
        fillColor: fillColorFor(feature),
        color: "#0b1b33",
        weight: 0.6,
        fillOpacity: 0.55
      }; },
      onEachFeature: function (feature, layer) {
        var iso = featureISO(feature);
        if (!iso) return;
        state.isoLayers[iso] = layer;
        var name = countryName(iso);
        var count = state.countryCounts[iso] ? state.countryCounts[iso] : 0;
        var tooltip = name + (count > 0
          ? '<div class="leaf-tooltip-count">' + count + ' channel' + (count !== 1 ? "s" : "") + '</div>'
          : '');
        layer.bindTooltip(tooltip, { sticky: false, className: "globe-leaf-tooltip" });
        layer.on({
          mouseover: function () {
            state.hoverISO = iso;
            applyStyles(layer);
          },
          mouseout: function () {
            state.hoverISO = null;
            applyStyles(layer);
          },
          click: function () {
            selectCountry(iso);
          }
        });
      }
    });

    geoLayer.addTo(map);

    // Default world view
    try {
      map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    } catch (e) {
      map.setView([20, 10], 2);
    }

    state.map = map;
    state.initialized = true;
    window.dispatchEvent(new CustomEvent("map:ready"));
  }

  // ── Global search integration ──────────────────────────────────────
  function onGlobalSearch(query) {
    if (!query || !query.trim()) {
      closePanel();
      return;
    }
    var q = query.toLowerCase().trim();
    var countries = window.ChannelData.countries || [];
    var matchCountry = countries.find(function (c) {
      return c.name.toLowerCase().indexOf(q) !== -1;
    });
    if (matchCountry && matchCountry.code) {
      selectCountry(matchCountry.code);
      return;
    }
    // Search for matching channels — pick the best (most matches) country
    var channels = window.ChannelData.channels || [];
    var matches = channels.filter(function (ch) {
      var text = (ch.name + " " + ch.country + " " + ch.category + " " + ch.languages.join(" ")).toLowerCase();
      return text.indexOf(q) !== -1;
    });
    if (matches.length > 0) {
      var isoCounts = {};
      matches.forEach(function (ch) {
        if (!isoCounts[ch.countryCode]) isoCounts[ch.countryCode] = 0;
        isoCounts[ch.countryCode]++;
      });
      var bestISO = Object.keys(isoCounts).sort(function (a, b) { return isoCounts[b] - isoCounts[a]; })[0];
      selectCountry(bestISO);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.TfarrajWorldMap = {
    init: function () {
      buildCountryIndex();
      initMap();
    },
    selectCountry: selectCountry,
    closePanel: closePanel,
    onSearch: onGlobalSearch,
    toggleCountryList: toggleCountryList,
    state: state
  };
})();