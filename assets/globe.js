// Tfarraj Interactive Globe — TV.Garden-inspired global channel discovery
// Uses globe.gl + topojson-client for 3D globe with country polygons
// Consumes existing window.ChannelData — no separate data source.

(function () {
  "use strict";

  // Numeric ISO ID → Alpha-2 (world-atlas uses numeric IDs)
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
    "010":"AQ","074":"BV","162":"CX","260":"GF","334":"HM","580":"MP",
    "633":"BL","660":"AN","666":"PM","690":"SC","736":"SD","772":"TK",
    "833":"IM","831":"GG","832":"JE","016":"AS","-99":null
  };

  // ISO alpha-2 → {lat, lng} centroids (for camera targets)
  var ISO_CENTER = {
    AF:{lat:33.9,lng:67.7},AL:{lat:41.2,lng:20.2},DZ:{lat:28.0,lng:1.7},
    AR:{lat:-38.4,lng:-63.6},AU:{lat:-25.3,lng:133.8},AT:{lat:47.5,lng:14.6},
    AZ:{lat:40.1,lng:47.6},BH:{lat:26.1,lng:50.6},BD:{lat:23.7,lng:90.4},
    BB:{lat:13.2,lng:-59.5},BY:{lat:53.7,lng:27.9},BE:{lat:50.5,lng:4.5},
    BT:{lat:27.5,lng:90.4},BO:{lat:-16.3,lng:-63.6},BA:{lat:43.9,lng:17.7},
    BW:{lat:-22.3,lng:24.7},BR:{lat:-14.2,lng:-51.9},BN:{lat:4.5,lng:114.7},
    BG:{lat:42.7,lng:25.5},KH:{lat:12.6,lng:105.0},CM:{lat:7.4,lng:12.3},
    CA:{lat:56.1,lng:-106.3},TD:{lat:15.5,lng:18.7},CL:{lat:-35.7,lng:-71.5},
    CN:{lat:35.9,lng:104.2},CO:{lat:4.6,lng:-74.3},CR:{lat:10.0,lng:-84.0},
    HR:{lat:45.1,lng:15.2},CU:{lat:21.5,lng:-77.8},CY:{lat:35.1,lng:33.4},
    CZ:{lat:49.8,lng:15.5},DK:{lat:56.3,lng:9.5},DJ:{lat:11.8,lng:42.6},
    DO:{lat:18.7,lng:-70.2},CD:{lat:-4.0,lng:21.8},EC:{lat:-1.8,lng:-78.2},
    EG:{lat:26.8,lng:30.8},SV:{lat:13.8,lng:-88.9},EE:{lat:58.6,lng:25.0},
    ET:{lat:9.1,lng:40.5},FJ:{lat:-17.7,lng:178.1},FI:{lat:61.9,lng:25.7},
    FR:{lat:46.2,lng:2.2},GA:{lat:-0.8,lng:11.6},GE:{lat:42.3,lng:43.4},
    DE:{lat:51.2,lng:10.5},GH:{lat:7.9,lng:-1.0},GR:{lat:39.1,lng:21.8},
    GT:{lat:15.8,lng:-90.2},GN:{lat:9.9,lng:-11.7},GY:{lat:4.9,lng:-58.9},
    HT:{lat:19.0,lng:-72.3},HN:{lat:15.2,lng:-86.2},HK:{lat:22.4,lng:114.1},
    HU:{lat:47.2,lng:19.5},IS:{lat:64.9,lng:-19.0},IN:{lat:20.6,lng:79.0},
    ID:{lat:-0.8,lng:113.9},IR:{lat:32.4,lng:53.7},IQ:{lat:33.2,lng:43.7},
    IE:{lat:53.4,lng:-8.2},IL:{lat:31.0,lng:34.9},IT:{lat:41.9,lng:12.6},
    CI:{lat:7.5,lng:-5.5},JM:{lat:18.1,lng:-77.3},JP:{lat:36.2,lng:138.3},
    JO:{lat:30.6,lng:36.2},KZ:{lat:48.0,lng:68.0},KE:{lat:-0.0,lng:37.9},
    KP:{lat:40.3,lng:127.5},KR:{lat:35.9,lng:127.8},KW:{lat:29.3,lng:47.6},
    KG:{lat:41.2,lng:74.8},LA:{lat:19.9,lng:102.5},LB:{lat:33.9,lng:35.9},
    LS:{lat:-29.6,lng:28.2},LV:{lat:56.9,lng:24.1},LR:{lat:6.4,lng:-9.4},
    LY:{lat:26.3,lng:17.2},LT:{lat:55.2,lng:23.9},LU:{lat:49.8,lng:6.1},
    MG:{lat:-18.8,lng:46.9},MW:{lat:-13.3,lng:34.3},MY:{lat:4.2,lng:101.9},
    MV:{lat:3.2,lng:73.2},ML:{lat:17.6,lng:-4.0},MT:{lat:35.9,lng:14.4},
    MR:{lat:21.0,lng:-10.9},MU:{lat:-20.3,lng:57.6},MX:{lat:23.6,lng:-102.6},
    MD:{lat:47.0,lng:28.9},MN:{lat:46.9,lng:103.8},ME:{lat:42.7,lng:19.4},
    MA:{lat:31.8,lng:-7.1},MZ:{lat:-18.7,lng:35.5},MM:{lat:21.9,lng:96.0},
    NA:{lat:-22.9,lng:18.5},NP:{lat:28.4,lng:84.1},NL:{lat:52.1,lng:5.3},
    NZ:{lat:-40.9,lng:174.9},NI:{lat:12.9,lng:-85.2},NE:{lat:17.6,lng:8.1},
    NG:{lat:9.1,lng:8.7},NO:{lat:60.5,lng:8.5},OM:{lat:21.5,lng:55.9},
    PK:{lat:30.4,lng:69.3},PA:{lat:8.5,lng:-80.8},PG:{lat:-6.3,lng:143.9},
    PY:{lat:-23.4,lng:-58.4},PE:{lat:-9.2,lng:-75.0},PH:{lat:12.9,lng:121.8},
    PL:{lat:51.9,lng:19.1},PT:{lat:39.4,lng:-8.2},QA:{lat:25.4,lng:51.2},
    CG:{lat:-0.2,lng:15.8},RO:{lat:45.9,lng:25.0},RU:{lat:61.5,lng:105.3},
    RW:{lat:-1.9,lng:29.9},SA:{lat:23.9,lng:45.1},SN:{lat:14.5,lng:-14.5},
    RS:{lat:44.0,lng:21.0},SL:{lat:8.5,lng:-11.8},SG:{lat:1.4,lng:103.8},
    SK:{lat:48.7,lng:19.7},SI:{lat:46.2,lng:14.9},SO:{lat:5.2,lng:46.2},
    ZA:{lat:-30.6,lng:22.9},ES:{lat:40.5,lng:-3.7},LK:{lat:7.9,lng:80.8},
    SD:{lat:12.9,lng:30.2},SZ:{lat:-26.5,lng:31.5},SE:{lat:60.1,lng:18.6},
    CH:{lat:46.8,lng:8.2},SY:{lat:34.8,lng:39.0},TW:{lat:23.7,lng:121.0},
    TJ:{lat:38.9,lng:71.3},TZ:{lat:-6.4,lng:34.9},TH:{lat:15.9,lng:100.9},
    TG:{lat:8.6,lng:1.2},TT:{lat:10.7,lng:-61.2},TN:{lat:33.9,lng:9.5},
    TR:{lat:38.9,lng:35.2},TM:{lat:38.9,lng:59.6},UG:{lat:1.4,lng:32.3},
    UA:{lat:48.4,lng:31.2},AE:{lat:23.4,lng:53.8},GB:{lat:55.4,lng:-3.4},
    US:{lat:37.1,lng:-95.7},UY:{lat:-32.5,lng:-55.8},UZ:{lat:41.4,lng:64.6},
    VE:{lat:6.4,lng:-66.6},VN:{lat:14.1,lng:108.3},YE:{lat:15.6,lng:48.5},
    ZM:{lat:-13.1,lng:27.8},ZW:{lat:-19.0,lng:29.2}
  };

  var GEOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
  var GEOJSON_CDN = "https://unpkg.com/globe.gl";
  var TOPOJSON_CDN = "https://unpkg.com/topojson-client@3";

  var state = {
    globe: null,
    features: [],          // GeoJSON features
    channelsByCountry: {}, // ISO alpha-2 → [channel, ...]
    countryCounts: {},     // ISO alpha-2 → count
    selectedISO: null,
    hoverISO: null,
    panelOpen: false,
    initialized: false
  };

  // ── Centroid from GeoJSON polygon ──────────────────────────────────
  function featureCentroid(feature) {
    var coords = [];
    function collect(a) {
      if (!a) return;
      if (typeof a[0] === "number" && typeof a[1] === "number") { coords.push(a); return; }
      a.forEach(collect);
    }
    collect(feature.geometry.coordinates);
    if (!coords.length) return null;
    var lat = 0, lng = 0;
    coords.forEach(function (c) { lat += c[1]; lng += c[0]; });
    return { lat: lat / coords.length, lng: lng / coords.length };
  }

  // ── Get ISO from a feature ─────────────────────────────────────────
  function featureISO(feature) {
    return NUM_TO_ISO[String(feature.id)] || null;
  }

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

  function renderChannelList(channels, container) {
    if (!channels.length) {
      container.innerHTML = '<div class="panel-empty">No channels available</div>';
      return;
    }
    // Sort: favorites first, then by name
    var sorted = channels.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    var html = '<div class="globe-channel-list">';
    sorted.forEach(function (ch) { html += channelCardHTML(ch); });
    html += "</div>";
    container.innerHTML = html;
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
    updateGlobeColors();
  }

  function closePanel() {
    var panel = document.getElementById("globe-panel");
    if (!panel) return;
    state.selectedISO = null;
    state.panelOpen = false;
    panel.classList.remove("open");
    updateGlobeColors();
  }

  // ── Country list panel ─────────────────────────────────────────────
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

    // Search filtering
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

    // Click handlers
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

  // ── Select a country (called from globe, panel, or list) ───────────
  function selectCountry(iso) {
    if (!iso || !state.globe) return;
    state.selectedISO = iso;
    openPanel(iso);

    // Zoom to country
    var center = ISO_CENTER[iso];
    if (!center) {
      // Compute centroid from feature geometry
      var feat = state.features.find(function (f) { return featureISO(f) === iso; });
      if (feat) center = featureCentroid(feat);
    }
    if (center) {
      state.globe.pointOfView({ lat: center.lat, lng: center.lng, altitude: 1.8 }, 800);
    }
  }

  // ── Update globe polygon colors ────────────────────────────────────
  function updateGlobeColors() {
    if (!state.globe || !state.features.length) return;
    state.globe.polygonCapColor(function (feature) {
      var iso = featureISO(feature);
      var count = state.countryCounts[iso] || 0;
      if (iso === state.selectedISO) return "rgba(0,200,255,0.55)";
      if (iso === state.hoverISO) return "rgba(0,170,220,0.40)";
      if (count > 0) return "rgba(0,140,200,0.18)";
      return "rgba(20,30,60,0.5)";
    });
    state.globe.polygonStrokeColor(function (feature) {
      var iso = featureISO(feature);
      var count = state.countryCounts[iso] || 0;
      if (iso === state.selectedISO) return "rgba(0,220,255,0.9)";
      if (iso === state.hoverISO) return "rgba(0,180,230,0.7)";
      if (count > 0) return "rgba(40,100,160,0.4)";
      return "rgba(30,40,70,0.25)";
    });
  }

  // ── Tooltip ────────────────────────────────────────────────────────
  function showTooltip(feature, x, y) {
    var tooltip = document.getElementById("globe-tooltip");
    if (!tooltip) return;
    var iso = featureISO(feature);
    if (!iso) { hideTooltip(); return; }
    var name = countryName(iso);
    var count = state.countryCounts[iso] || 0;
    tooltip.innerHTML = "<strong>" + name + "</strong>"
      + (count > 0 ? "<br>" + count + " channel" + (count !== 1 ? "s" : "") : '<br class="tooltip-sep">No channels');
    tooltip.classList.add("visible");
    positionTooltip(tooltip, x, y);
  }

  function positionTooltip(tooltip, x, y) {
    var pad = 14;
    var tw = tooltip.offsetWidth || 150;
    var th = tooltip.offsetHeight || 50;
    var left = x + pad;
    var top = y - th / 2;
    if (left + tw > window.innerWidth - pad) left = x - tw - pad;
    if (top < pad) top = pad;
    if (top + th > window.innerHeight - pad) top = window.innerHeight - th - pad;
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    var tooltip = document.getElementById("globe-tooltip");
    if (tooltip) tooltip.classList.remove("visible");
  }

  // ── Initialize globe ───────────────────────────────────────────────
  function initGlobe() {
    var container = document.getElementById("globe-canvas");
    if (!container || !window.Globe) {
      console.warn("Globe container or Globe library not found");
      return;
    }
    buildCountryIndex();

    var globe = Globe()(container)
      .width(container.clientWidth)
      .height(container.clientHeight)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .atmosphereColor("rgba(40,120,200,0.25)")
      .atmosphereAltitude(0.25)
      .polygonsData(state.features)
      .polygonCapColor(function (feature) {
        var iso = featureISO(feature);
        var count = state.countryCounts[iso] || 0;
        if (count > 0) return "rgba(0,140,200,0.18)";
        return "rgba(20,30,60,0.5)";
      })
      .polygonSideColor(function () { return "rgba(0,80,120,0.08)"; })
      .polygonStrokeColor(function (feature) {
        var iso = featureISO(feature);
        var count = state.countryCounts[iso] || 0;
        if (count > 0) return "rgba(40,100,160,0.4)";
        return "rgba(30,40,70,0.25)";
      })
      .polygonAltitude(function (feature) {
        var iso = featureISO(feature);
        return (state.countryCounts[iso] || 0) > 0 ? 0.005 : 0.002;
      })
      .polygonLabel(function (feature) {
        var iso = featureISO(feature);
        if (!iso) return "";
        var name = countryName(iso);
        var count = state.countryCounts[iso] || 0;
        return "<div class='globe-polygon-label'>"
          + "<strong>" + name + "</strong>"
          + (count > 0 ? "<br>" + count + " channels" : "")
          + "</div>";
      })
      .onPolygonHover(function (feature) {
        var iso = feature ? featureISO(feature) : null;
        state.hoverISO = iso;
        container.style.cursor = iso && (state.countryCounts[iso] || 0) > 0 ? "pointer" : "default";
        updateGlobeColors();
      })
      .onPolygonClick(function (feature) {
        var iso = featureISO(feature);
        if (!iso) return;
        selectCountry(iso);
      });

    state.globe = globe;

    // Enable orbit controls (mouse/touch rotation + zoom)
    globe.controls().enableDamping = true;
    globe.controls().dampingFactor = 0.15;
    globe.controls().autoRotate = true;
    globe.controls().autoRotateSpeed = 0.3;

    // Stop auto-rotate on user interaction
    var controls = globe.controls();
    var stopAutoRotate = function () { controls.autoRotate = false; };
    container.addEventListener("pointerdown", stopAutoRotate, { once: true });

    // Resize handler
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (container.clientWidth && container.clientHeight) {
          globe.width(container.clientWidth).height(container.clientHeight);
        }
      }, 200);
    });

    state.initialized = true;
    window.dispatchEvent(new CustomEvent("globe:ready"));
  }

  // ── Global search integration ──────────────────────────────────────
  function onGlobalSearch(query) {
    if (!query || !query.trim()) {
      closePanel();
      if (state.globe) {
        state.globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 600);
      }
      return;
    }
    var q = query.toLowerCase().trim();
    var channels = window.ChannelData.channels || [];
    // Search for matching country name
    var countries = window.ChannelData.countries || [];
    var matchCountry = countries.find(function (c) {
      return c.name.toLowerCase().indexOf(q) !== -1;
    });
    if (matchCountry && matchCountry.code) {
      selectCountry(matchCountry.code);
      return;
    }
    // Search for matching channels — group by country
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
  window.TfarrajGlobe = {
    init: function () {
      buildCountryIndex();
      initGlobe();
    },
    selectCountry: selectCountry,
    closePanel: closePanel,
    onSearch: onGlobalSearch,
    toggleCountryList: toggleCountryList,
    state: state
  };
})();
