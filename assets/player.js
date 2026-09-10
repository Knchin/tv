// Shared live-stream player.
//
// Two entry points:
//   1. Player pages: set window.ACTIVE_CHANNEL (from assets/channels.js) before
//      this script runs and include the markup with #vid, #btn-refresh,
//      #ovl-loading, #ovl-tap, #ovl-error, #err-sub. The player initializes on
//      this existing DOM.
//   2. In-page mounting: window.TfarrajPlayer.mount(container, channel) builds
//      the player markup inside any element (used by the /map/ browse page).
//
// LB2 is served through a Cloudflare Function proxy (/api/stream) because
// games1.elahmad.store binds tokens to the minting IP — a token minted
// elsewhere cannot play in a visitor's browser. The function mints + proxies
// the playlist and segments itself.

(function () {
  "use strict";

  var LB2_STREAM_URL = "/api/stream?channel=lb2";

  function buildPlayerDOM(container, channel) {
    container.innerHTML = "";

    var wrap = document.createElement("div");
    wrap.className = "player-wrap";

    var title = document.createElement("div");
    title.className = "globe-channel-title";
    title.innerHTML = (channel && channel.name ? channel.name : "Live") +
      (channel && channel.country ? ' <span class="channel-country">· ' + channel.country + '</span>' : '');
    wrap.appendChild(title);

    var player = document.createElement("div");
    player.className = "player";
    player.innerHTML =
      '<video id="vid" controls playsinline></video>' +
      '<div class="ovl" id="ovl-loading" hidden><div class="spin"></div><div class="big">Connecting to live stream…</div></div>' +
      '<div class="ovl" id="ovl-tap" hidden><div class="big">Tap to start playback</div><div class="sub">Your browser requires a tap to play audio and video.</div></div>' +
      '<div class="ovl err" id="ovl-error" hidden><div class="big">The channel is temporarily unavailable.</div><div class="sub" id="err-sub">The live signal could not be loaded.</div></div>';

    var actions = document.createElement("div");
    actions.className = "player-actions";
    actions.innerHTML =
      '<button class="btn-refresh" id="btn-refresh" aria-label="Refresh stream token" title="Refresh stream token"><span class="ico">🗘</span><span class="spin-sm"></span></button>' +
      '<button class="btn-copy" id="btn-copy" aria-label="Copy stream URL" title="Copy stream URL"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>' +
      '<button class="btn-cast" id="btn-cast" aria-label="Cast to device" title="Cast to TV or monitor"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"></path><line x1="2" y1="20" x2="2.01" y2="20"></line></svg></button>' +
      '<button class="btn-fullscreen" id="btn-fullscreen" aria-label="Fullscreen"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"></path></svg></button>';

    wrap.appendChild(player);
    wrap.appendChild(actions);

    container.appendChild(wrap);

    return {
      player: player,
      vid: wrap.querySelector("#vid"),
      btn: wrap.querySelector("#btn-refresh"),
      errSub: wrap.querySelector("#err-sub"),
      ovlLoading: wrap.querySelector("#ovl-loading"),
      ovlTap: wrap.querySelector("#ovl-tap"),
      ovlError: wrap.querySelector("#ovl-error"),
      btnCopy: wrap.querySelector("#btn-copy"),
      btnCast: wrap.querySelector("#btn-cast"),
      btnFullscreen: wrap.querySelector("#btn-fullscreen")
    };
  }

  function createPlayer(els, channel) {
    var DEFAULT_URL =
      channel && channel.id === "lb2"
        ? LB2_STREAM_URL
        : channel && channel.url ? channel.url : "";
    var channelType = channel && channel.type ? channel.type : "hls";

    var vid = els.vid;
    var btn = els.btn;
    var errSub = els.errSub;
    var ovlLoading = els.ovlLoading;
    var ovlTap = els.ovlTap;
    var ovlError = els.ovlError;
    var currentUrl = null;
    var hls = null;
    var userActivated = false;
    var youtubeIframe = null;

    function overlays(show) {
      ovlLoading.hidden = show !== "loading";
      ovlTap.hidden = show !== "tap";
      ovlError.hidden = show !== "error";
    }

    function hideVideoPlayer() {
      if (vid) vid.style.display = "none";
    }

    function showVideoPlayer() {
      if (vid) vid.style.display = "";
    }

    function loadYouTubeEmbed(url) {
      hideVideoPlayer();
      if (youtubeIframe) {
        youtubeIframe.remove();
      }
      var playerDiv = els.player;
      if (!playerDiv) return;
      youtubeIframe = document.createElement("iframe");
      youtubeIframe.src = url;
      youtubeIframe.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:none;background:#000;";
      youtubeIframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      youtubeIframe.allowFullscreen = true;
      youtubeIframe.onload = function () {
        overlays(null);
      };
      youtubeIframe.onerror = function () {
        overlays("error");
        errSub.textContent = "Failed to load YouTube embed.";
      };
      playerDiv.appendChild(youtubeIframe);
      overlays(null);
    }

    // Hide the loading overlay once real frames start flowing.
    vid.addEventListener("playing", function () {
      overlays(null);
    });
    vid.addEventListener("canplay", function () {
      if (!ovlError.hidden) return;
      overlays(null);
    });

    function play(url) {
      if (!url) {
        overlays("error");
        errSub.textContent = "No stream URL.";
        return;
      }
      currentUrl = url;
      overlays("loading");

      if (hls) {
        try {
          hls.destroy();
        } catch (e) {}
        hls = null;
      }
      if (youtubeIframe) {
        youtubeIframe.remove();
        youtubeIframe = null;
      }
      vid.pause();
      vid.removeAttribute("src");
      try {
        vid.load();
      } catch (e) {}
      showVideoPlayer();

      function startPlay() {
        vid.muted = true;
        var p = vid.play();
        if (p)
          p.then(function () {
            userActivated = true;
          }).catch(function () {
            if (!userActivated) {
              overlays("tap");
            }
          });
      }

      // YouTube embed type - use iframe instead of hls.js
      if (channelType === "youtube") {
        loadYouTubeEmbed(url);
        return;
      }

      if (vid.canPlayType("application/vnd.apple.mpegurl")) {
        vid.src = url;
        vid.onloadedmetadata = function () {
          overlays(null);
        };
        vid.onerror = function () {
          showStreamError();
        };
        startPlay();
        return;
      }

      if (window.Hls && Hls.isSupported()) {
        hls = new Hls({
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 8,
          maxBufferLength: 30,
          enableWorker: true,
        });
        hls.loadSource(url);
        hls.attachMedia(vid);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          startPlay();
        });
        hls.on(Hls.Events.ERROR, function (evt, data) {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            showStreamError();
          }
        });
      } else {
        vid.src = url;
        vid.onloadedmetadata = function () {
          overlays(null);
        };
        vid.onerror = function () {
          showStreamError();
        };
        startPlay();
      }
    }

    // Tap overlay triggers playback within the user gesture.
    ovlTap.addEventListener("click", function () {
      if (!currentUrl) return;
      userActivated = true;
      overlays("loading");
      var p = vid.play();
      if (p) p.catch(function () {});
    });

    function isPlayableM3u8(url) {
      return fetch(url, { method: "GET" })
        .then(function (res) {
          if (!res.ok) return false;
          return res.text().then(function (t) {
            return t.trim().indexOf("#EXTM3U") === 0;
          });
        })
        .catch(function () {
          return false;
        });
    }

    function showStreamError() {
      overlays("error");
      errSub.textContent = "Stream failed / expired. Tap to reconnect.";
      ovlError.style.cursor = "pointer";
      ovlError.onclick = function () {
        refreshToken();
      };
    }

    function refreshToken() {
      if (btn) {
        btn.disabled = true;
        btn.classList.add("loading");
      }
      overlays("loading");

      var serverMint = function () {
        return fetch("/api/token?id=" + encodeURIComponent(channel.id))
          .then(function (res) {
            return res.ok ? res.json() : null;
          })
          .then(function (data) {
            return data && data.url ? data.url : null;
          });
      };

      var urlPromise =
        channel.id === "lb2"
          ? Promise.resolve(LB2_STREAM_URL)
          : serverMint();

      return urlPromise
        .then(function (url) {
          if (url) {
            return isPlayableM3u8(url).then(function (ok) {
              if (ok) {
                play(url);
                return;
              }
              play(DEFAULT_URL);
            });
          }
          play(DEFAULT_URL);
        })
        .catch(function () {
          play(DEFAULT_URL);
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove("loading");
          }
        });
    }

    // Refresh button: try to mint a fresh token, but only use it if it
    // verifies as a real playable playlist.
    if (btn) {
      btn.addEventListener("click", function () {
        refreshToken();
      });
    }

    // Player pages already wire copy/cast/fullscreen in their inline scripts;
    // skip re-binding there to avoid double-firing. Dynamic mounts (browse
    // page) get them wired here.
    var isPlayerPage = document.body.classList.contains("player-page");

    if (els.btnFullscreen && !isPlayerPage) {
      els.btnFullscreen.addEventListener("click", function () {
        var playerDiv = els.player;
        if (playerDiv.requestFullscreen) playerDiv.requestFullscreen();
        else if (playerDiv.webkitRequestFullscreen) playerDiv.webkitRequestFullscreen();
        else if (playerDiv.msRequestFullscreen) playerDiv.msRequestFullscreen();
      });
    }

    if (els.btnCast && !isPlayerPage) {
      els.btnCast.addEventListener("click", function () {
        if (vid && vid.remote && vid.remote.prompt) {
          vid.remote.prompt().catch(function (err) {
            console.error("Cast error:", err);
          });
        } else {
          alert("Casting is not supported by this browser/device.");
        }
      });
    }

    if (els.btnCopy && !isPlayerPage) {
      els.btnCopy.addEventListener("click", function () {
        var url = channel && channel.url;
        if (!url) {
          alert("No stream URL available.");
          return;
        }
        navigator.clipboard.writeText(url).then(function () {
          var old = els.btnCopy.innerHTML;
          els.btnCopy.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          els.btnCopy.classList.add("copied");
          setTimeout(function () {
            els.btnCopy.innerHTML = old;
            els.btnCopy.classList.remove("copied");
          }, 1500);
        }).catch(function () {
          alert("Could not copy the URL to clipboard.");
        });
      });
    }

    // Autoplay to start (will show tap overlay if blocked).
    play(DEFAULT_URL);
  }

  // In-page mounting API (browse page).
  window.TfarrajPlayer = {
    mount: function (container, channel) {
      if (!container) return;
      var els = buildPlayerDOM(container, channel);
      createPlayer(els, channel);
    }
  };

  // Player page bootstrap: existing DOM with #vid + overlays + ACTIVE_CHANNEL.
  function initPlayer() {
    if (!window.ACTIVE_CHANNEL) return;
    var els = {
      player: document.querySelector(".player"),
      vid: document.getElementById("vid"),
      btn: document.getElementById("btn-refresh"),
      errSub: document.getElementById("err-sub"),
      ovlLoading: document.getElementById("ovl-loading"),
      ovlTap: document.getElementById("ovl-tap"),
      ovlError: document.getElementById("ovl-error"),
      btnCopy: document.getElementById("btn-copy"),
      btnCast: document.getElementById("btn-cast"),
      btnFullscreen: document.getElementById("btn-fullscreen")
    };
    // Don't double-init when the player was mounted dynamically on this page.
    if (!els.vid) return;
    createPlayer(els, window.ACTIVE_CHANNEL);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPlayer);
  } else {
    initPlayer();
  }
})();