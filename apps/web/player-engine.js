/* FLIXTV HLS engine
 * Uses hls.js where Media Source Extensions are available and native HLS otherwise.
 * Pass only stream URLs that CineSRC has authorized FLIXTV to play.
 */
(function (global) {
  "use strict";

  class FlixHlsPlayer {
    constructor(video, options = {}) {
      if (!(video instanceof HTMLVideoElement)) throw new TypeError("A valid video element is required.");
      this.video = video;
      this.options = options;
      this.hls = null;
      this.source = "";
      this.destroyed = false;
      this.onState = options.onState || function () {};
      this.onError = options.onError || function () {};
      this.onLevels = options.onLevels || function () {};
    }

    static isSupported() {
      return !!(global.Hls && global.Hls.isSupported()) ||
        !!document.createElement("video").canPlayType("application/vnd.apple.mpegurl");
    }

    async load(source, { autoplay = false, startPosition = -1 } = {}) {
      if (this.destroyed) throw new Error("Player has been destroyed.");
      const url = String(source || "").trim();
      if (!/^https:\/\//i.test(url)) throw new Error("Vendos një URL HTTPS të vlefshme M3U8.");
      if (!/\.m3u8(?:$|[?#])/i.test(url)) throw new Error("URL-ja nuk duket si playlist M3U8.");

      this.stopEngine();
      this.source = url;
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();

      if (global.Hls && global.Hls.isSupported()) {
        const hls = new global.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
          maxBufferLength: 30,
          capLevelToPlayerSize: true
        });
        this.hls = hls;
        hls.on(global.Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
        hls.on(global.Hls.Events.MANIFEST_PARSED, (_event, data) => {
          this.onLevels(data.levels.map((level, index) => ({
            index,
            height: level.height,
            bitrate: level.bitrate
          })));
          this.onState({ state: "ready", engine: "hls.js" });
          if (startPosition > 0) this.video.currentTime = startPosition;
          if (autoplay) this.video.play().catch(error => this.onError(error));
        });
        hls.on(global.Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            this.onState({ state: "warning", details: data.details });
            return;
          }
          const error = new Error("HLS " + data.type + ": " + data.details);
          this.onError(error);
          if (data.type === global.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === global.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else this.stopEngine();
        });
        hls.attachMedia(this.video);
        return;
      }

      if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
        this.video.src = url;
        this.video.addEventListener("loadedmetadata", () => {
          this.onLevels([]);
          this.onState({ state: "ready", engine: "native-hls" });
          if (startPosition > 0) this.video.currentTime = startPosition;
          if (autoplay) this.video.play().catch(error => this.onError(error));
        }, { once: true });
        this.video.addEventListener("error", () => {
          const mediaError = this.video.error;
          this.onError(new Error("Native HLS playback failed" + (mediaError ? " (code " + mediaError.code + ")" : "")));
        }, { once: true });
        this.video.load();
        return;
      }
      throw new Error("Ky shfletues nuk mbështet HLS. Nevojitet hls.js ose native HLS.");
    }

    setQuality(index) {
      if (!this.hls) return false;
      this.hls.currentLevel = Number(index);
      return true;
    }

    getQualities() {
      if (!this.hls) return [];
      return this.hls.levels.map((level, index) => ({ index, height: level.height, bitrate: level.bitrate }));
    }

    stopEngine() {
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
    }

    destroy() {
      if (this.destroyed) return;
      this.stopEngine();
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
      this.source = "";
      this.destroyed = true;
    }
  }

  global.FlixHlsPlayer = FlixHlsPlayer;
})(window);
