(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.ui = ABBMA.ui || {};

  const constants = ABBMA.core && ABBMA.core.constants;
  const cache = ABBMA.core && ABBMA.core.cache;
  const browserApi = ABBMA.platform && ABBMA.platform.browserApi;

  // Options UI depends on shared constants and cache helpers to avoid duplicating
  // storage keys/default logic in the page layer.
  if (!constants || !cache || !browserApi) {
    throw new Error("ABBMA: core/constants.js, core/cache.js, and platform/browser-api.js are required for ui/options.js");
  }

  const DEFAULTS = constants.SETTINGS_DEFAULTS;
  const UI_SECTIONS = {
    prefetch: ["fetchDelay", "prefetchMode"],
    cache: ["cacheLimit"],
    domain: ["preferredDomain"]
  };

  function updateCacheCount(cacheData) {
    const count = Object.keys(cacheData || {}).length;
    // Keep cache size text in one place so init and live updates stay consistent.
    document.getElementById("cacheCount").textContent = `Total cached magnet links: ${count}`;
  }

  function syncInputValues(key, value) {
    // Keep number/range/select controls in sync so each setting has one source of truth in the UI.
    const numberInput = document.getElementById(key);
    const rangeInput = document.getElementById(`${key}Range`);
    const selectInput = document.getElementById(key);

    if (numberInput && numberInput.type === "number") {
      numberInput.value = value;
    }
    if (rangeInput) {
      rangeInput.value = value;
    }
    if (selectInput && selectInput.tagName === "SELECT") {
      selectInput.value = value;
    }

    refreshResetButtonState(key, value);
  }

  function refreshResetButtonState(key, currentValue) {
    const fieldResetButton = document.querySelector(`.field-reset[data-field="${key}"]`);
    if (!fieldResetButton) {
      return;
    }

    // String coercion keeps comparison stable across number/select input sources.
    const isModified = String(currentValue) !== String(DEFAULTS[key]);
    fieldResetButton.disabled = !isModified;

    Object.entries(UI_SECTIONS).forEach(([section, fields]) => {
      if (!fields.includes(key)) {
        return;
      }

      // Section reset should only enable when at least one field in that section differs from defaults.
      const isSectionModified = fields.some((fieldKey) => {
        const input = document.getElementById(fieldKey);
        return input && String(input.value) !== String(DEFAULTS[fieldKey]);
      });

      const sectionResetButton = document.querySelector(`.section-reset[data-section="${section}"]`);
      if (sectionResetButton) {
        sectionResetButton.disabled = !isSectionModified;
      }
    });
  }

  async function initializeOptions() {
    // Read all settings in one storage call to reduce async churn and keep UI init atomic.
    const settingKeys = Object.keys(DEFAULTS);
    const store = await browserApi.storage.get([...settingKeys, constants.STORAGE_KEYS.magnetCache]);
    const migratedSettings = {};

    settingKeys.forEach((key) => {
      const rawValue = store[key] !== undefined ? store[key] : DEFAULTS[key];
      let value = rawValue;

      // Normalize persisted values so options always opens in a valid state.
      if (key === constants.STORAGE_KEYS.prefetchMode) {
        value = constants.normalizePrefetchMode(rawValue);
      } else if (key === constants.STORAGE_KEYS.fetchDelay) {
        value = constants.normalizeFetchDelay(rawValue);
      } else if (key === constants.STORAGE_KEYS.preferredDomain) {
        value = constants.normalizeAbbDomain(rawValue);
      }

      if (value !== rawValue) {
        migratedSettings[key] = value;
      }

      syncInputValues(key, value);
    });

    if (Object.keys(migratedSettings).length > 0) {
      // Write back once so future reads are clean and no repeat migration is needed.
      await browserApi.storage.set(migratedSettings);
    }

    const cacheData = store[constants.STORAGE_KEYS.magnetCache] || {};
    // Show cache size here so users can make informed cleanup/capacity decisions.
    updateCacheCount(cacheData);
  }

  async function saveSettings() {
    // Serialize all controls from defaults so new settings automatically participate
    // without changing save wiring.
    const settingsToSave = {};
    Object.keys(DEFAULTS).forEach((key) => {
      const input = document.getElementById(key);
      if (!input) {
        return;
      }

      settingsToSave[key] = typeof DEFAULTS[key] === "number"
        ? (key === constants.STORAGE_KEYS.fetchDelay
          ? constants.normalizeFetchDelay(parseInt(input.value, 10))
          : parseInt(input.value, 10))
        // Normalize at save-time to guard against stale/manual values.
        : (key === constants.STORAGE_KEYS.prefetchMode
          ? constants.normalizePrefetchMode(input.value)
          : (key === constants.STORAGE_KEYS.preferredDomain
            ? constants.normalizeAbbDomain(input.value)
            : input.value));
    });

    await browserApi.storage.set(settingsToSave);

    const statusElement = document.getElementById("saveStatus");
    statusElement.textContent = "Settings saved!";
    setTimeout(() => {
      statusElement.textContent = "";
    }, 2000);

    await initializeOptions();
  }

  function performFieldReset(fieldKey) {
    // Field reset is UI-only until Save, preserving explicit user commit semantics.
    syncInputValues(fieldKey, DEFAULTS[fieldKey]);
  }

  function performSectionReset(sectionKey) {
    const fields = UI_SECTIONS[sectionKey];
    if (!fields) {
      return;
    }

    fields.forEach((fieldKey) => performFieldReset(fieldKey));
  }

  function performGlobalReset() {
    // Confirmation prevents accidental full reset while keeping cache intact.
    if (global.confirm("Reset all settings to defaults? (Your cached magnet links will be preserved)")) {
      Object.keys(DEFAULTS).forEach((fieldKey) => performFieldReset(fieldKey));
    }
  }

  async function clearMagnetCache() {
    // Cache clearing is destructive, so require explicit confirmation before write.
    if (global.confirm("Are you sure you want to clear the magnet link cache? This cannot be undone.")) {
      await cache.clearCache();
      await initializeOptions();
    }
  }

  async function debugExportCache() {
    // Debug export intentionally writes to console rather than file to keep
    // the extension permission footprint minimal.
    const cacheData = await cache.getCache();
    console.group("ABBMA: Magnet Link Cache Export");
    console.log("Timestamp:", new Date().toISOString());
    console.table(cacheData || {});
    console.groupEnd();
    global.alert("Cache data has been logged to the console (F12 > Console).");
  }

  function openAudioBookBay() {
    // Use the current selected value so users can open immediately before saving if desired.
    const domainSelect = document.getElementById(constants.STORAGE_KEYS.preferredDomain);
    const domain = constants.normalizeAbbDomain(domainSelect ? domainSelect.value : DEFAULTS.preferredDomain);
    const url = `https://${domain}/`;
    global.open(url, "_blank", "noopener");
  }

  function bindRangeAndInputSync() {
    // Two-way sync keeps sliders and number fields visually and semantically aligned.
    Object.keys(DEFAULTS).forEach((key) => {
      const input = document.getElementById(key);
      const rangeInput = document.getElementById(`${key}Range`);

      if (!input) {
        return;
      }

      const handleInput = (event) => {
        const value = event.target.value;
        if (rangeInput) {
          rangeInput.value = value;
        }
        if (input.type === "number") {
          input.value = value;
        }
        refreshResetButtonState(key, value);
      };

      input.addEventListener("input", handleInput);
      if (rangeInput) {
        rangeInput.addEventListener("input", handleInput);
      }
    });
  }

  function bindActionButtons() {
    // Single binding pass keeps event registration centralized and avoids duplicate listeners.
    document.getElementById("save").addEventListener("click", saveSettings);
    document.getElementById("openAbb").addEventListener("click", openAudioBookBay);
    document.getElementById("resetAll").addEventListener("click", performGlobalReset);
    document.getElementById("clearCache").addEventListener("click", clearMagnetCache);
    document.getElementById("printCache").addEventListener("click", debugExportCache);

    document.querySelectorAll(".field-reset").forEach((button) => {
      button.addEventListener("click", () => performFieldReset(button.dataset.field));
    });

    document.querySelectorAll(".section-reset").forEach((button) => {
      button.addEventListener("click", () => performSectionReset(button.dataset.section));
    });
  }

  function bindLiveCacheCount() {
    const storageArea = browserApi.namespace.storage && browserApi.namespace.storage.onChanged;
    if (!storageArea || typeof storageArea.addListener !== "function") {
      return;
    }

    // Listen across extension contexts so options reflects cache changes without reload.
    storageArea.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      const cacheChange = changes[constants.STORAGE_KEYS.magnetCache];
      if (!cacheChange) {
        return;
      }

      updateCacheCount(cacheChange.newValue || {});
    });
  }

  let initialized = false;

  async function init() {
    // Protect against duplicate listener registration if init is called more than once.
    if (initialized) {
      await initializeOptions();
      return;
    }

    initialized = true;
    bindRangeAndInputSync();
    bindActionButtons();
    bindLiveCacheCount();
    await initializeOptions();
  }

  // Public options entrypoint consumed by options.js bootstrap.
  ABBMA.ui.options = {
    init
  };
})(window);
