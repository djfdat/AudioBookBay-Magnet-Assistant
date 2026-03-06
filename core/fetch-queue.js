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

  async function fetchMagnetMetadata(url, options = {}) {
    const delayMs = Number(options.delayMs) || 0;
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
      await sleep(delayMs);
    }

    try {
      // Parse remote HTML as a detached document so extraction logic can reuse the same parser path.
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
