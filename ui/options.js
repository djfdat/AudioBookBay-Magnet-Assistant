(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.ui = ABBMA.ui || {};

  const constants = ABBMA.core && ABBMA.core.constants;
  const cache = ABBMA.core && ABBMA.core.cache;
  const browserApi = ABBMA.platform && ABBMA.platform.browserApi;

  if (!constants || !cache || !browserApi) {
    throw new Error("ABBMA: core/constants.js, core/cache.js, and platform/browser-api.js are required for ui/options.js");
  }

  const DEFAULTS = constants.SETTINGS_DEFAULTS;
  const UI_SECTIONS = {
    prefetch: ["fetchDelay", "concurrencyLimit", "prefetchMode"],
    cache: ["cacheLimit"]
  };

  function syncInputValues(key, value) {
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

    const isModified = String(currentValue) !== String(DEFAULTS[key]);
    fieldResetButton.disabled = !isModified;

    Object.entries(UI_SECTIONS).forEach(([section, fields]) => {
      if (!fields.includes(key)) {
        return;
      }

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
    const settingKeys = Object.keys(DEFAULTS);
    const store = await browserApi.storage.get([...settingKeys, constants.STORAGE_KEYS.magnetCache]);

    settingKeys.forEach((key) => {
      const value = store[key] !== undefined ? store[key] : DEFAULTS[key];
      syncInputValues(key, value);
    });

    const cacheData = store[constants.STORAGE_KEYS.magnetCache] || {};
    const count = Object.keys(cacheData).length;
    document.getElementById("cacheCount").textContent = `Total cached magnet links: ${count}`;
  }

  async function saveSettings() {
    const settingsToSave = {};
    Object.keys(DEFAULTS).forEach((key) => {
      const input = document.getElementById(key);
      if (!input) {
        return;
      }

      settingsToSave[key] = typeof DEFAULTS[key] === "number"
        ? parseInt(input.value, 10)
        : input.value;
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
    if (global.confirm("Reset all settings to defaults? (Your cached magnet links will be preserved)")) {
      Object.keys(DEFAULTS).forEach((fieldKey) => performFieldReset(fieldKey));
    }
  }

  async function clearMagnetCache() {
    if (global.confirm("Are you sure you want to clear the magnet link cache? This cannot be undone.")) {
      await cache.clearCache();
      await initializeOptions();
    }
  }

  async function debugExportCache() {
    const cacheData = await cache.getCache();
    console.group("ABBMA: Magnet Link Cache Export");
    console.log("Timestamp:", new Date().toISOString());
    console.table(cacheData || {});
    console.groupEnd();
    global.alert("Cache data has been logged to the console (F12 > Console).");
  }

  function bindRangeAndInputSync() {
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
    document.getElementById("save").addEventListener("click", saveSettings);
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

  let initialized = false;

  async function init() {
    if (initialized) {
      await initializeOptions();
      return;
    }

    initialized = true;
    bindRangeAndInputSync();
    bindActionButtons();
    await initializeOptions();
  }

  ABBMA.ui.options = {
    init
  };
})(window);
