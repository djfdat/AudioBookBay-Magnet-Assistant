(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const constants = ABBMA.core.constants;
  const browserApi = ABBMA.platform && ABBMA.platform.browserApi;

  if (!constants || !browserApi) {
    throw new Error("ABBMA: core/constants.js and platform/browser-api.js must be loaded before core/cache.js");
  }

  function normalizeUrlKey(url) {
    return String(url || "").split("?")[0].split("#")[0];
  }

  async function getCache() {
    const store = await browserApi.storage.get(constants.STORAGE_KEYS.magnetCache);
    return store[constants.STORAGE_KEYS.magnetCache] || {};
  }

  async function getCachedData(url) {
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

    const cache = store[constants.STORAGE_KEYS.magnetCache] || {};
    const configuredLimit = Number(store[constants.STORAGE_KEYS.cacheLimit]);
    const fallbackLimit = constants.SETTINGS_DEFAULTS.cacheLimit;
    const limit = Number.isFinite(configuredLimit) && configuredLimit > 0
      ? configuredLimit
      : fallbackLimit;

    cache[key] = { ...metadata, timestamp: Date.now() };
    const keys = Object.keys(cache);

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

    return settings;
  }

  async function clearCache() {
    await browserApi.storage.set({
      [constants.STORAGE_KEYS.magnetCache]: {}
    });
  }

  async function getCacheCount() {
    const cache = await getCache();
    return Object.keys(cache).length;
  }

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
