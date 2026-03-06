(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const cache = ABBMA.core.cache;
  const parser = ABBMA.core.parser;

  // Fetching depends on cache for read/write short-circuiting and parser for metadata extraction.
  if (!cache || !parser) {
    throw new Error("ABBMA: core/cache.js and core/parser.js must be loaded before core/fetch-queue.js");
  }

  function sleep(ms) {
    // Delay helper supports optional throttling to reduce burst load on ABB pages.
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Global throttle state shared by all list-page interactions in this content script.
  // Slot reservation is serialized so concurrent hover/click bursts cannot bypass delay.
  let nextAllowedFetchAt = 0;
  let reservationChain = Promise.resolve();
  let lastFetchStartedAt = Number.NEGATIVE_INFINITY;
  // In-flight map ensures repeated interactions for the same book share one request.
  const inFlightByUrl = new Map();

  async function reserveThrottleSlot(delayMs) {
    const normalizedDelay = Math.max(0, Number(delayMs) || 0);

    let releaseReservation;
    const reservationAssigned = new Promise((resolve) => {
      releaseReservation = resolve;
    });

    reservationChain = reservationChain
      .catch(() => {})
      .then(() => {
        const now = Date.now();
        // Reserve a concrete start slot now, so queued requests can show total wait time
        // including delays from requests that were queued earlier.
        const scheduledAt = Math.max(now, nextAllowedFetchAt);
        nextAllowedFetchAt = scheduledAt + normalizedDelay;
        releaseReservation({ scheduledAt, normalizedDelay });
      });

    return reservationAssigned;
  }

  async function waitForThrottleWindow(delayMs, onDelayUpdate) {
    const { scheduledAt, normalizedDelay } = await reserveThrottleSlot(delayMs);

    while (true) {
      const now = Date.now();
      // Enforce delay from the previous real request start, not just reserved schedule,
      // so the minimum spacing remains strict even when earlier requests start late.
      const waitUntil = Math.max(scheduledAt, lastFetchStartedAt + normalizedDelay);
      const remainingMs = Math.max(0, waitUntil - now);
      if (remainingMs <= 0) {
        break;
      }
      if (typeof onDelayUpdate === "function") {
        onDelayUpdate(remainingMs, normalizedDelay);
      }
      await sleep(Math.min(250, remainingMs));
    }

    lastFetchStartedAt = Date.now();
  }

  async function fetchMagnetMetadata(url, options = {}) {
    const delayMs = Number(options.delayMs) || 0;
    const onDelayUpdate = options.onDelayUpdate;
    const onNetworkStart = options.onNetworkStart;
    const requestKey = cache.normalizeUrlKey(url);

    // Return the existing promise when the same URL is already being fetched.
    const existingRequest = inFlightByUrl.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const requestPromise = (async () => {
      // Cache-first flow avoids unnecessary page fetches when metadata is already known.
      const cached = await cache.getCachedData(url);

      if (cached) {
        return {
          ok: true,
          fromCache: true,
          metadata: cached
        };
      }

      if (delayMs > 0) {
        await waitForThrottleWindow(delayMs, onDelayUpdate);
      }

      try {
        // Parse remote HTML as a detached document so extraction logic can reuse the same parser path.
        if (typeof onNetworkStart === "function") {
          onNetworkStart();
        }
        const response = await fetch(url);
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const metadata = parser.extractTorrentMetadata(doc);

        if (!metadata) {
          // Distinguish parse failures from network failures for clearer UI feedback.
          return {
            ok: false,
            errorType: "parse"
          };
        }

        await cache.cacheMagnetData(url, metadata);
        return {
          ok: true,
          fromCache: false,
          metadata
        };
      } catch (_err) {
        return {
          ok: false,
          errorType: "network"
        };
      }
    })();

    inFlightByUrl.set(requestKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      // Remove only if this promise is still the active entry for the key.
      if (inFlightByUrl.get(requestKey) === requestPromise) {
        inFlightByUrl.delete(requestKey);
      }
    }
  }

  async function runWorkerPool(items, workersCount, workerFn) {
    // Simple bounded-concurrency worker pool shared by any future bulk operations.
    const queue = Array.from(items || []);
    const concurrency = Math.max(1, Number(workersCount) || 1);

    async function worker() {
      while (queue.length > 0) {
        const task = queue.shift();
        if (!task) {
          break;
        }
        await workerFn(task);
      }
    }

    // Launch fixed worker count and wait for all queue consumers to complete.
    const workers = Array(concurrency).fill(null).map(() => worker());
    await Promise.all(workers);
  }

  // Export both single-fetch and pool primitives so UI can choose per-mode strategy.
  ABBMA.core.fetchQueue = {
    fetchMagnetMetadata,
    runWorkerPool
  };
})(window);
