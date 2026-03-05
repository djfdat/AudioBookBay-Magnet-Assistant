(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.platform = ABBMA.platform || {};

  const browserNamespace = typeof global.browser !== "undefined"
    ? global.browser
    : (typeof global.chrome !== "undefined" ? global.chrome : null);

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
