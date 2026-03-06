(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.platform = ABBMA.platform || {};

  // Firefox exposes `browser`, Chromium exposes `chrome`.
  // Resolve once so feature modules stay runtime-agnostic.
  const browserNamespace = typeof global.browser !== "undefined"
    ? global.browser
    : (typeof global.chrome !== "undefined" ? global.chrome : null);

  // Fail fast during startup if extension APIs are unavailable.
  if (!browserNamespace || !browserNamespace.storage || !browserNamespace.storage.local) {
    throw new Error("ABBMA: Browser API namespace is unavailable.");
  }

  async function storageGet(keys) {
    return browserNamespace.storage.local.get(keys);
  }

  async function storageSet(values) {
    return browserNamespace.storage.local.set(values);
  }

  async function clipboardWriteText(text) {
    return navigator.clipboard.writeText(text);
  }

  async function clipboardReadText() {
    return navigator.clipboard.readText();
  }

  // Centralized adapter keeps browser API usage consistent across modules
  // and avoids repeated namespace branching at each callsite.
  ABBMA.platform.browserApi = {
    namespace: browserNamespace,
    storage: {
      get: storageGet,
      set: storageSet
    },
    clipboard: {
      writeText: clipboardWriteText,
      readText: clipboardReadText
    }
  };
})(window);
