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
  const FETCH_DELAY_MIN_MS = 5000;
  const FETCH_DELAY_MAX_MS = 20000;
  const DEFAULT_ABB_DOMAIN = ABB_DOMAINS[0];

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
    cacheLimit: 1000,
    fetchDelay: FETCH_DELAY_MIN_MS,
    prefetchMode: PREFETCH_MODES.HOVER,
    preferredDomain: DEFAULT_ABB_DOMAIN
  };

  function normalizeFetchDelay(value) {
    // Coerce legacy/string values and clamp to supported range.
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return SETTINGS_DEFAULTS.fetchDelay;
    }

    return Math.max(FETCH_DELAY_MIN_MS, Math.min(FETCH_DELAY_MAX_MS, Math.trunc(parsed)));
  }

  function normalizeAbbDomain(domain) {
    return ABB_DOMAINS.includes(domain)
      ? domain
      : DEFAULT_ABB_DOMAIN;
  }

  // Storage keys are centralized to prevent typo-driven split-brain state across modules.
  const STORAGE_KEYS = {
    magnetCache: "magnetCache",
    cacheLimit: "cacheLimit",
    fetchDelay: "fetchDelay",
    prefetchMode: "prefetchMode",
    preferredDomain: "preferredDomain"
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
    FETCH_DELAY_MIN_MS,
    FETCH_DELAY_MAX_MS,
    DEFAULT_ABB_DOMAIN,
    PREFETCH_MODES,
    PREFETCH_MODE_VALUES,
    normalizePrefetchMode,
    normalizeFetchDelay,
    normalizeAbbDomain,
    SETTINGS_DEFAULTS,
    STORAGE_KEYS,
    SELECTORS,
    PARSER_FALLBACKS
  };
})(window);
