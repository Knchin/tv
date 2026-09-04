// Shared live-stream player. The player page sets window.ACTIVE_CHANNEL (an
// object from assets/channels.js) before this script runs, then calls
// initPlayer(). This preserves the original player behavior exactly.

(function () {
  function initPlayer() {
    var channel = window.ACTIVE_CHANNEL;
    var DEFAULT_URL = channel && channel.url ? channel.url : "";
    var channelType = channel && channel.type ? channel.type : "hls";

    var vid = document.getElementById("vid");
    var btn = document.getElementById("btn-refresh");
    var errSub = document.getElementById("err-sub");
    var ovlLoading = document.getElementById("ovl-loading");
    var ovlTap = document.getElementById("ovl-tap");
    var ovlError = document.getElementById("ovl-error");
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
      var playerDiv = document.querySelector(".player");
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

    function showStreamError() {
      overlays("error");
      errSub.textContent = "Stream failed / expired. Tap to reconnect.";
      ovlError.style.cursor = "pointer";
      ovlError.onclick = function () {
        refreshToken();
      };
    }

    function b64ToBuf(b64) {
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }

    function hexToBuf(hex) {
      var bytes = new Uint8Array(hex.length / 2);
      for (var i = 0; i < bytes.length; i++)
        bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
      return bytes;
    }

    // Try to mint a token directly from the visitor's own browser. elahmad
    // binds tokens to the requesting IP, so a browser-minted token (visitor's
    // IP) is the only kind that can actually play in this browser. Falls back
    // to the server endpoint when cross-origin requests are blocked.
    function mintTokenInBrowser() {
      var PAGE = "https://www.elahmad.ru/tv/mobiletv/glarb.php?id=lb2";
      var RESULT = "https://www.elahmad.ru/tv/result/embed_result_elahmad_81.php";
      var UA =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

      return fetch(PAGE, {
        headers: { "User-Agent": UA, Referer: "https://www.elahmad.ru/" },
      })
        .then(function (r) {
          if (!r.ok) throw new Error("page " + r.status);
          return r.text();
        })
        .then(function (html) {
          var marker = 'name="csrf-token" content="';
          var i = html.indexOf(marker);
          if (i === -1) throw new Error("no csrf-token");
          return html.slice(i + marker.length).split('"')[0];
        })
        .then(function (csrf) {
          return fetch(RESULT, {
            method: "POST",
            headers: {
              "User-Agent": UA,
              Referer: PAGE,
              Origin: "https://www.elahmad.ru",
              "Content-Type": "application/x-www-form-urlencoded",
              "X-Requested-With": "XMLHttpRequest",
            },
            body: "id=lb2&csrf_token=" + encodeURIComponent(csrf),
          })
            .then(function (r) {
              if (!r.ok) throw new Error("result " + r.status);
              return r.json();
            })
            .then(function (data) {
              if (!data.link_4) throw new Error("no link_4");
              return crypto.subtle.importKey(
                "raw",
                hexToBuf(data.key),
                { name: "AES-CBC" },
                false,
                ["decrypt"]
              ).then(function (key) {
                return crypto.subtle.decrypt(
                  { name: "AES-CBC", iv: hexToBuf(data.iv) },
                  key,
                  b64ToBuf(data.link_4)
                );
              }).then(function (plain) {
                return new TextDecoder().decode(plain)
                  .replace(/[\x00-\x1f]+$/, "");
              });
            });
        });
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
          ? mintTokenInBrowser().catch(serverMint).then(function (url) {
              return url || serverMint();
            })
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