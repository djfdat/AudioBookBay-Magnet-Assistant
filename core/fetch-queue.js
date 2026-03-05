(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const cache = ABBMA.core.cache;
  const parser = ABBMA.core.parser;

  if (!cache || !parser) {
    throw new Error("ABBMA: core/cache.js and core/parser.js must be loaded before core/fetch-queue.js");
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchMagnetMetadata(url, options = {}) {
    const delayMs = Number(options.delayMs) || 0;
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
      const response = await fetch(url);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const metadata = parser.extractTorrentMetadata(doc);

      if (!metadata) {
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

    const workers = Array(concurrency).fill(null).map(() => worker());
    await Promise.all(workers);
  }

  ABBMA.core.fetchQueue = {
    fetchMagnetMetadata,
    runWorkerPool
  };
})(window);
