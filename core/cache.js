(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const constants = ABBMA.core.constants;
  const browserApi = ABBMA.platform && ABBMA.platform.browserApi;

  // Cache layer depends on constants for keys/defaults and browser adapter for storage access.
  if (!constants || !browserApi) {
    throw new Error("ABBMA: core/constants.js and platform/browser-api.js must be loaded before core/cache.js");
  }

  function normalizeUrlKey(url) {
    // Query/hash changes are not meaningful for ABB book pages.
    // Storing by normalized path prevents duplicate cache entries for the same post.
    return String(url || "").split("?")[0].split("#")[0];
  }

  async function getCache() {
    // Always return an object so callers can rely on object operations without null checks.
    const store = await browserApi.storage.get(constants.STORAGE_KEYS.magnetCache);
    return store[constants.STORAGE_KEYS.magnetCache] || {};
  }

  async function getCachedData(url) {
    // Read-through helper keeps URL normalization logic centralized.
    const key = normalizeUrlKey(url);
    const cache = await getCache();
    return cache[key] || null;
  }

  async function cacheMagnetData(url, metadata) {
    const key = normalizeUrlKey(url);
    const store = await browserApi.storage.get([
      constants.STORAGE_KEYS.magnetCache,
      constants.STORAGE_KEYS.cacheLimit
    ]);

    // Fall back to defaults when user-configured limits are absent/invalid
    // so cache behavior is always bounded.
    const cache = store[constants.STORAGE_KEYS.magnetCache] || {};
    const configuredLimit = Number(store[constants.STORAGE_KEYS.cacheLimit]);
    const fallbackLimit = constants.SETTINGS_DEFAULTS.cacheLimit;
    const limit = Number.isFinite(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : fallbackLimit;

    cache[key] = { ...metadata, timestamp: Date.now() };
    const keys = Object.keys(cache);

    // Keep cache bounded by evicting the oldest entry when the configured limit is exceeded.
    if (keys.length > limit) {
      const oldestKey = keys.sort((a, b) => {
        const left = Number(cache[a] && cache[a].timestamp) || 0;
        const right = Number(cache[b] && cache[b].timestamp) || 0;
        return left - right;
      })[0];
      delete cache[oldestKey];
    }

    await browserApi.storage.set({
      [constants.STORAGE_KEYS.magnetCache]: cache
    });
  }

  async function loadSettingsWithDefaults() {
    const settingKeys = Object.keys(constants.SETTINGS_DEFAULTS);
    const store = await browserApi.storage.get(settingKeys);
    const settings = {};

    settingKeys.forEach((key) => {
      settings[key] = store[key] !== undefined
        ? store[key]
        : constants.SETTINGS_DEFAULTS[key];
    });

    // Migrate legacy/invalid mode values (e.g. removed "Always") at read time.
    // Persisting the normalized value keeps storage and UI consistent after first load.
    const normalizedPrefetchMode = constants.normalizePrefetchMode(settings.prefetchMode);
    if (settings.prefetchMode !== normalizedPrefetchMode) {
      settings.prefetchMode = normalizedPrefetchMode;
      await browserApi.storage.set({
        [constants.STORAGE_KEYS.prefetchMode]: normalizedPrefetchMode
      });
    }

    // Clamp legacy/out-of-range delays and persist once so all future reads are valid.
    const normalizedFetchDelay = constants.normalizeFetchDelay(settings.fetchDelay);
    if (settings.fetchDelay !== normalizedFetchDelay) {
      settings.fetchDelay = normalizedFetchDelay;
      await browserApi.storage.set({
        [constants.STORAGE_KEYS.fetchDelay]: normalizedFetchDelay
      });
    }

    // Domain preference is constrained to known ABB mirrors for the options-page quick-open button.
    const normalizedPreferredDomain = constants.normalizeAbbDomain(settings.preferredDomain);
    if (settings.preferredDomain !== normalizedPreferredDomain) {
      settings.preferredDomain = normalizedPreferredDomain;
      await browserApi.storage.set({
        [constants.STORAGE_KEYS.preferredDomain]: normalizedPreferredDomain
      });
    }

    return settings;
  }

  async function clearCache() {
    // Preserve settings while resetting cache payload only.
    await browserApi.storage.set({
      [constants.STORAGE_KEYS.magnetCache]: {}
    });
  }

  async function getCacheCount() {
    const cache = await getCache();
    return Object.keys(cache).length;
  }

  // Export cache primitives so UI/injector can share one storage contract.
  ABBMA.core.cache = {
    normalizeUrlKey,
    getCache,
    getCachedData,
    cacheMagnetData,
    loadSettingsWithDefaults,
    clearCache,
    getCacheCount
  };
})(window);
