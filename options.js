/**
 * ABBMA Options Page Logic
 * Manages user settings and magnet link cache.
 */

const DEFAULTS = {
  cacheLimit: 100,
  fetchDelay: 1000,
  concurrencyLimit: 3,
  prefetchMode: 'Always',
};

const UI_SECTIONS = {
  prefetch: ['fetchDelay', 'concurrencyLimit', 'prefetchMode'],
  cache: ['cacheLimit']
};

/**
 * Initializes the options page by loading saved settings and cache stats.
 */
async function initializeOptions() {
  const store = await chrome.storage.local.get(['cacheLimit', 'fetchDelay', 'concurrencyLimit', 'prefetchMode', 'magnetCache']);
  
  // Sync all inputs with stored values or defaults
  Object.keys(DEFAULTS).forEach(key => {
    const value = store[key] !== undefined ? store[key] : DEFAULTS[key];
    syncInputValues(key, value);
  });
  
  // Update cache statistics
  const cache = store.magnetCache || {};
  const count = Object.keys(cache).length;
  document.getElementById('cacheCount').textContent = `Total cached magnet links: ${count}`;
}

/**
 * Synchronizes inputs (Number/Range/Select) with stored values.
 * @param {string} key - The settings key.
 * @param {any} value - The value to set.
 */
function syncInputValues(key, value) {
  const numInput = document.getElementById(key);
  const rangeInput = document.getElementById(key + 'Range');
  const selectInput = document.getElementById(key); // Also handles selects

  if (numInput && numInput.type === 'number') numInput.value = value;
  if (rangeInput) rangeInput.value = value;
  if (selectInput && selectInput.tagName === 'SELECT') selectInput.value = value;
  
  refreshResetButtonState(key, value);
}

/**
 * Determines if reset buttons (field/section) should be enabled based on current values.
 * @param {string} key - Modified setting key.
 * @param {any} currentVal - New value.
 */
function refreshResetButtonState(key, currentVal) {
  const fieldResetBtn = document.querySelector(`.field-reset[data-field="${key}"]`);
  if (!fieldResetBtn) return;

  const isModified = String(currentVal) !== String(DEFAULTS[key]);
  fieldResetBtn.disabled = !isModified;

  // Check section-wide modification status
  Object.entries(UI_SECTIONS).forEach(([section, fields]) => {
    if (fields.includes(key)) {
      const isSectionModified = fields.some(f => {
        const input = document.getElementById(f);
        return input && String(input.value) !== String(DEFAULTS[f]);
      });
      const sectionResetBtn = document.querySelector(`.section-reset[data-section="${section}"]`);
      if (sectionResetBtn) sectionResetBtn.disabled = !isSectionModified;
    }
  });
}

/**
 * Persists current input values to chrome.storage.
 */
async function saveSettings() {
  const settingsToSave = {};
  Object.keys(DEFAULTS).forEach(key => {
    const input = document.getElementById(key);
    if (input) {
      settingsToSave[key] = input.type === 'number' ? parseInt(input.value, 10) : input.value;
    }
  });
  
  await chrome.storage.local.set(settingsToSave);
  
  const statusEl = document.getElementById('saveStatus');
  statusEl.textContent = 'Settings saved!';
  setTimeout(() => statusEl.textContent = '', 2000);
  
  // Re-run initialization to refresh reset button states
  initializeOptions();
}

/**
 * Resets a single setting field to its default value.
 * @param {string} fieldKey - The key to reset.
 */
function performFieldReset(fieldKey) {
  syncInputValues(fieldKey, DEFAULTS[fieldKey]);
}

/**
 * Resets an entire section of settings.
 * @param {string} sectionKey - The section ID to reset.
 */
function performSectionReset(sectionKey) {
  const fields = UI_SECTIONS[sectionKey];
  if (fields) {
    fields.forEach(f => performFieldReset(f));
  }
}

/**
 * Resets all settings to factory defaults.
 */
function performGlobalReset() {
  if (confirm('Reset all settings to defaults? (Your cached magnet links will be preserved)')) {
    Object.keys(DEFAULTS).forEach(f => performFieldReset(f));
  }
}

/**
 * Wipes the local magnet link cache.
 */
async function clearMagnetCache() {
  if (confirm('Are you sure you want to clear the magnet link cache? This cannot be undone.')) {
    await chrome.storage.local.set({ magnetCache: {} });
    initializeOptions();
  }
}

/**
 * Exports the current cache to the browser console for debugging.
 */
async function debugExportCache() {
  const data = await chrome.storage.local.get('magnetCache');
  console.group('ABBMA: Magnet Link Cache Export');
  console.log('Timestamp:', new Date().toISOString());
  console.table(data.magnetCache || {});
  console.groupEnd();
  alert('Cache data has been logged to the console (F12 > Console).');
}

// --- Event Listeners ---

// Setup live syncing between Number and Range inputs
Object.keys(DEFAULTS).forEach(key => {
  const input = document.getElementById(key);
  const rangeInput = document.getElementById(key + 'Range');

  if (input) {
    const handleInput = (e) => {
      const val = e.target.value;
      if (rangeInput) rangeInput.value = val;
      if (input.type === 'number') input.value = val;
      refreshResetButtonState(key, val);
    };
    input.addEventListener('input', handleInput);
    if (rangeInput) rangeInput.addEventListener('input', handleInput);
  }
});

// Primary actions
document.addEventListener('DOMContentLoaded', initializeOptions);
document.getElementById('save').addEventListener('click', saveSettings);
document.getElementById('resetAll').addEventListener('click', performGlobalReset);
document.getElementById('clearCache').addEventListener('click', clearMagnetCache);
document.getElementById('printCache').addEventListener('click', debugExportCache);

// Delegated reset actions
document.querySelectorAll('.field-reset').forEach(btn => {
  btn.addEventListener('click', () => performFieldReset(btn.dataset.field));
});

document.querySelectorAll('.section-reset').forEach(btn => {
  btn.addEventListener('click', () => performSectionReset(btn.dataset.section));
});
