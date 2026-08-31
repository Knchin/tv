// Shared live-stream player. The player page sets window.ACTIVE_CHANNEL (an
// object from assets/channels.js) before this script runs, then calls
// initPlayer(). This preserves the original player behavior exactly.

(function () {
  function initPlayer() {
    var channel = window.ACTIVE_CHANNEL;
    var DEFAULT_URL = channel && channel.url ? channel.url : "";

    var vid = document.getElementById("vid");
    var btn = document.getElementById("btn-refresh");
    var errSub = document.getElementById("err-sub");
    var ovlLoading = document.getElementById("ovl-loading");
    var ovlTap = document.getElementById("ovl-tap");
    var ovlError = document.getElementById("ovl-error");
    var currentUrl = null;
    var hls = null;
    var userActivated = false;

    function overlays(show) {
      ovlLoading.hidden = show !== "loading";
      ovlTap.hidden = show !== "tap";
      ovlError.hidden = show !== "error";
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
      vid.pause();
      vid.removeAttribute("src");
      try {
        vid.load();
      } catch (e) {}

      function startPlay() {
        // Start muted so autoplay isn't blocked by the browser (muted autoplay
        // is allowed). The user can unmute via the player controls.
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

      if (vid.canPlayType("application/vnd.apple.mpegurl")) {
        vid.src = url;
        vid.onloadedmetadata = function () {
          overlays(null);
        };
        vid.onerror = function () {
          overlays("error");
          errSub.textContent = "Stream failed / expired.";
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
            overlays("error");
            errSub.textContent = "Stream failed / expired.";
          }
        });
      } else {
        vid.src = url;
        vid.onloadedmetadata = function () {
          overlays(null);
        };
        vid.onerror = function () {
          overlays("error");
          errSub.textContent = "Stream failed / expired.";
        };
        startPlay();
      }
    }

    // Tap overlay triggers playback within the user gesture (not a bypass).
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

    // Refresh: try to mint a fresh token, but only use it if it verifies as a
    // real playable playlist. Otherwise keep playing the embedded stream.
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      btn.classList.add("loading");
      overlays("loading");
      try {
        var res = await fetch("/api/token");
        var data = res.ok ? await res.json() : null;
        if (data && data.url && (await isPlayableM3u8(data.url))) {
          play(data.url);
        } else {
          play(DEFAULT_URL);
        }
      } catch (e) {
        play(DEFAULT_URL);
      } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
      }
    });

    // Autoplay to start (will show tap overlay if blocked).
    play(DEFAULT_URL);
  }

  // Run once the DOM is ready (the page's scripts are loaded at end of body,
  // so this is immediate).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPlayer);
  } else {
    initPlayer();
  }
})();
