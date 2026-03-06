(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const constants = ABBMA.core.constants;

  // Explicit dependency guard catches load-order mistakes early.
  if (!constants) {
    throw new Error("ABBMA: core/constants.js must be loaded before core/magnet.js");
  }

  function normalizeMetadata(metadata) {
    // Normalize once at the boundary so all downstream builders
    // can assume clean, stable metadata fields.
    const hash = String(metadata.hash || "").trim();
    const title = String(metadata.title || constants.TITLE_FALLBACK).trim() || constants.TITLE_FALLBACK;
    const trackers = Array.isArray(metadata.trackers)
      ? metadata.trackers.map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    return { hash, title, trackers };
  }

  function buildMagnetLink(metadata) {
    const normalized = normalizeMetadata(metadata);
    // Always include info hash and display name; trackers remain optional
    // to support posts that expose only minimal metadata.
    const base = `${constants.MAGNET_URI_SCHEME}${normalized.hash}&dn=${encodeURIComponent(normalized.title)}`;
    const tr = normalized.trackers.length > 0 ? `&tr=${normalized.trackers.join("&tr=")}` : "";
    return base + tr;
  }

  // Expose pure helpers separately so parser/UI can reuse them without hidden state.
  ABBMA.core.magnet = {
    normalizeMetadata,
    buildMagnetLink
  };
})(window);
