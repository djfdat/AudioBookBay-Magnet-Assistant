const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const FETCH_QUEUE_PATH = path.resolve(__dirname, "..", "core", "fetch-queue.js");
const FETCH_QUEUE_SOURCE = fs.readFileSync(FETCH_QUEUE_PATH, "utf8");

function createHarness({ fetchLatencyMs = 0 } = {}) {
  const cachedData = new Map();
  const fetchStarts = [];
  let fetchCount = 0;

  const cache = {
    normalizeUrlKey(url) {
      return String(url || "").split("?")[0].split("#")[0];
    },
    async getCachedData(url) {
      return cachedData.get(this.normalizeUrlKey(url)) || null;
    },
    async cacheMagnetData(url, metadata) {
      cachedData.set(this.normalizeUrlKey(url), metadata);
    }
  };

  const parser = {
    extractTorrentMetadata() {
      return {
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        title: "Test Title",
        trackers: ["udp://tracker.example:80/announce"]
      };
    }
  };

  class FakeDOMParser {
    parseFromString(html) {
      return { html };
    }
  }

  const context = vm.createContext({
    window: {
      ABBMA: {
        core: {
          cache,
          parser
        }
      }
    },
    DOMParser: FakeDOMParser,
    fetch: async (url) => {
      fetchCount += 1;
      fetchStarts.push({ url, at: Date.now() });
      if (fetchLatencyMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, fetchLatencyMs));
      }
      return {
        async text() {
          return `<html><body>${url}</body></html>`;
        }
      };
    },
    setTimeout,
    clearTimeout,
    Date,
    Promise,
    Map,
    console
  });

  vm.runInContext(FETCH_QUEUE_SOURCE, context, { filename: "core/fetch-queue.js" });

  return {
    fetchQueue: context.window.ABBMA.core.fetchQueue,
    fetchStarts,
    getFetchCount: () => fetchCount
  };
}

test("de-duplicates concurrent in-flight requests for the same URL", async () => {
  const harness = createHarness({ fetchLatencyMs: 40 });
  const url = "https://audiobookbay.li/audio-book-1";

  const [first, second] = await Promise.all([
    harness.fetchQueue.fetchMagnetMetadata(url, { delayMs: 0 }),
    harness.fetchQueue.fetchMagnetMetadata(url, { delayMs: 0 })
  ]);

  assert.equal(harness.getFetchCount(), 1, "same URL should share a single network request");
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);

  const third = await harness.fetchQueue.fetchMagnetMetadata(url, { delayMs: 0 });
  assert.equal(harness.getFetchCount(), 1, "subsequent request should come from cache");
  assert.equal(third.fromCache, true);
});

test("enforces minimum spacing between fetch starts for different URLs", async () => {
  const harness = createHarness();
  const delayMs = 60;

  await Promise.all([
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-a", { delayMs }),
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-b", { delayMs }),
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-c", { delayMs })
  ]);

  const starts = harness.fetchStarts.map((entry) => entry.at).sort((a, b) => a - b);
  assert.equal(starts.length, 3);
  assert.ok(
    starts[1] - starts[0] >= delayMs,
    `expected at least ${delayMs}ms between first and second fetch starts`
  );
  assert.ok(
    starts[2] - starts[1] >= delayMs,
    `expected at least ${delayMs}ms between second and third fetch starts`
  );
});

test("queued requests report cumulative delay countdowns", async () => {
  const harness = createHarness();
  const delayMs = 80;
  const updatesByUrl = {
    a: [],
    b: [],
    c: []
  };

  await Promise.all([
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-a", {
      delayMs,
      onDelayUpdate: (remainingMs) => updatesByUrl.a.push(remainingMs)
    }),
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-b", {
      delayMs,
      onDelayUpdate: (remainingMs) => updatesByUrl.b.push(remainingMs)
    }),
    harness.fetchQueue.fetchMagnetMetadata("https://audiobookbay.li/book-c", {
      delayMs,
      onDelayUpdate: (remainingMs) => updatesByUrl.c.push(remainingMs)
    })
  ]);

  assert.ok(updatesByUrl.b.length > 0, "second queued request should emit delay updates");
  assert.ok(updatesByUrl.c.length > 0, "third queued request should emit delay updates");
  assert.ok(
    updatesByUrl.c[0] > updatesByUrl.b[0] + Math.floor(delayMs / 2),
    "later queued requests should start with a larger remaining delay"
  );
});
