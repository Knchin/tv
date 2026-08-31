/* ============================================================
   LivePlayer — reusable HLS player component (vanilla ES module)
   Handles native HLS (Safari) + hls.js, all player states,
   retry/recover, fullscreen, picture-in-picture, live indicator,
   and strict cleanup to avoid leaks on channel switch.
   ============================================================ */

export class LivePlayer {
  /**
   * @param {HTMLVideoElement} video
   * @param {(state: PlayerState) => void} [onState]
   */
  constructor(video, onState) {
    if (!video) throw new Error("LivePlayer: video element is required");
    this.video = video;
    this.hls = null;
    this.onState = onState || (() => {});
    this._retries = 0;
    this._maxRetries = 3;
    this._retryTimer = null;
    this._loading = false;
    this._bound = {};

    this._setupAttrs();
    this._bind();
  }

  _setupAttrs() {
    if (!this.video.hasAttribute("playsinline")) this.video.setAttribute("playsinline", "");
    this.video.setAttribute("controlslist", "nodownload");
  }

  _setState(s) {
    this._loading = s.type === "loading";
    this.onState(s);
  }

  _bind() {
    const el = this.video;
    const unbind = {};
    this._bound = unbind;

    const onLoaded = (unbind.loaded = (e) => {
      this._setState({ type: "ready" });
    });
    const onPlaying = (unbind.playing = () => {
      this._retries = 0;
      this._setState({ type: "playing" });
    });
    const onWait = (unbind.waiting = () => {
      if (this._loading) this._setState({ type: "buffering" });
    });
    const onEnded = (unbind.ended = () => {
      this._setState({ type: "ended" });
    });
    const onError = (unbind.error = () => {
      this._setState({ type: "error" });
    });

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("loadeddata", onLoaded);
    el.addEventListener("playing", onPlaying);
    el.addEventListener("waiting", onWait);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);
  }

  _unbind() {
    const el = this.video;
    for (const [evt, fn] of Object.values(this._bound)) {
      el.removeEventListener(evt, fn);
    }
    this._bound = {};
  }

  /**
   * Load and play an HLS source.
   * @param {string} src
   */
  load(src) {
    this.destroy(); // ensure clean slate
    if (!src) {
      this._setState({ type: "idle" });
      return;
    }
    this._setState({ type: "loading" });

    const el = this.video;

    // Native HLS (Safari / iOS) — no hls.js needed
    if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = src;
      this._autoplay();
      return;
    }

    // hls.js for everything else
    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 8,
        maxBufferLength: 30,
        enableWorker: true,
      });
      this.hls = hls;
      hls.loadSource(src);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        el.play().then(() => {}).catch(() => this._handleAutoplayBlock());
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        this._handleFatalHlsError(data, hls);
      });
    } else {
      // No HLS support at all — try the raw source anyway
      el.src = src;
      this._autoplay();
    }
  }

  _handleFatalHlsError(data, hls) {
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
      // Transient network glitch — retry with backoff
      this._retries += 1;
      this._setState({ type: "reconnecting", attempt: this._retries });
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(() => {
        if (this._retries > this._maxRetries && this.hls) {
          this._setState({ type: "error", retryable: true });
          return;
        }
        hls.startLoad();
      }, Math.min(800 * this._retries, 4000));
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
      // Codec/decode hiccup — recoverable
      this._setState({ type: "reconnecting", attempt: this._retries });
      hls.recoverMediaError();
    } else {
      // Unrecoverable (manifest/parse)
      this._setState({ type: "error", retryable: true });
    }
  }

  _handleAutoplayBlock() {
    // Respect browser policy — never bypass. Just surface a needs-interaction state.
    this._setState({ type: "needsInteraction" });
  }

  _autoplay() {
    const el = this.video;
    el.play().then(() => {}).catch(() => this._handleAutoplayBlock());
  }

  retry(src) {
    this._retries = 0;
    if (src) this.load(src);
    else this.video.play().catch(() => this._handleAutoplayBlock());
  }

  toggleFullscreen() {
    const el = this.video;
    const doc = document;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : Promise.resolve();
      (p || Promise.resolve()).catch(() => {});
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
  }

  async togglePictureInPicture() {
    const el = this.video;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (el.requestPictureInPicture) {
        await el.requestPictureInPicture();
      }
    } catch (e) {
      /* unsupported or blocked — ignore */
    }
  }

  get supportsPip() {
    return !!(this.video && this.video.requestPictureInPicture);
  }

  /** Tear down hls.js instance and detach source. Call on switch/unmount. */
  destroy() {
    clearTimeout(this._retryTimer);
    if (this.hls) {
      try { this.hls.destroy(); } catch (e) { /* ignore */ }
      this.hls = null;
    }
    try { this.video.pause(); } catch (e) { /* ignore */ }
    this.video.removeAttribute("src");
    try { this.video.load(); } catch (e) { /* ignore */ }
    this._retries = 0;
  }
}
