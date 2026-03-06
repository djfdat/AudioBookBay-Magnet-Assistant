(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  // Canonical domain list drives both manifest patterns and runtime selector scope.
  // Keeping it centralized avoids drift when ABB mirror domains change.
  const ABB_DOMAINS = [
    "audiobookbay.lu",
    "audiobookbay.li",
    "audiobookbay.fi",
    "audiobookbay.nl",
    "audiobookbay.is",
    "audiobookbay.se"
  ];

  // Derived match patterns reduce manual duplication and keep manifest/runtime aligned.
  const ABB_MATCH_PATTERNS = ABB_DOMAINS.map((domain) => `*://*.${domain}/*`);

  const MAGNET_URI_SCHEME = "magnet:?xt=urn:btih:";
  const TITLE_FALLBACK = "Audiobook";

  // List pages are intentionally on-demand only.
  // "Always" was removed to avoid automatic background fetching on homepage/search pages.
  const PREFETCH_MODES = {
    HOVER: "Hover",
    CLICK: "Click",
    NEVER: "Never"
  };
  const PREFETCH_MODE_VALUES = Object.values(PREFETCH_MODES);

  // Older installs may still have removed values (for example "Always") in storage.
  // Unknown modes are normalized to Hover so users keep a safe, non-automatic default.
  function normalizePrefetchMode(mode) {
    return PREFETCH_MODE_VALUES.includes(mode)
      ? mode
      : PREFETCH_MODES.HOVER;
  }

  // Hover is the default to keep list-page prefetch explicit and user-driven.
  const SETTINGS_DEFAULTS = {
    cacheLimit: 100,
    fetchDelay: 1000,
    concurrencyLimit: 3,
    prefetchMode: PREFETCH_MODES.HOVER
  };

  // Storage keys are centralized to prevent typo-driven split-brain state across modules.
  const STORAGE_KEYS = {
    magnetCache: "magnetCache",
    cacheLimit: "cacheLimit",
    fetchDelay: "fetchDelay",
    concurrencyLimit: "concurrencyLimit",
    prefetchMode: "prefetchMode"
  };

  // Selectors are ordered by confidence so query helpers can gracefully degrade
  // across ABB theme and markup variants.
  const SELECTORS = {
    isSinglePost: [".postContent > table"],
    postTitle: [".postTitle"],
    titleCandidates: [".postTitle h1", ".postTitle"],
    postRows: [".postContent table tr", ".torrent_info tr"],
    listLinks: [".postTitle a"],
    nativeMagnetLink: ["#magnetLink"]
  };

  // Labels are normalized by parser before comparison; these arrays represent
  // accepted semantic aliases seen across domain/theme variants.
  const PARSER_FALLBACKS = {
    infoHashLabels: ["info hash", "hash"],
    trackerLabels: ["tracker", "announce url", "announce"]
  };

  // Export all shared constants/functions through one namespace object so each
  // module can depend on a single stable contract.
  ABBMA.core.constants = {
    ABB_DOMAINS,
    ABB_MATCH_PATTERNS,
    MAGNET_URI_SCHEME,
    TITLE_FALLBACK,
    PREFETCH_MODES,
    PREFETCH_MODE_VALUES,
    normalizePrefetchMode,
    SETTINGS_DEFAULTS,
    STORAGE_KEYS,
    SELECTORS,
    PARSER_FALLBACKS
  };
})(window);
