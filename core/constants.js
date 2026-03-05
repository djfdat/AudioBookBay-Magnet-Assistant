(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const ABB_DOMAINS = [
    "audiobookbay.lu",
    "audiobookbay.li",
    "audiobookbay.fi",
    "audiobookbay.nl",
    "audiobookbay.is",
    "audiobookbay.se"
  ];

  const ABB_MATCH_PATTERNS = ABB_DOMAINS.map((domain) => `*://*.${domain}/*`);

  const MAGNET_URI_SCHEME = "magnet:?xt=urn:btih:";
  const TITLE_FALLBACK = "Audiobook";

  const PREFETCH_MODES = {
    ALWAYS: "Always",
    HOVER: "Hover",
    CLICK: "Click",
    NEVER: "Never"
  };

  const SETTINGS_DEFAULTS = {
    cacheLimit: 100,
    fetchDelay: 1000,
    concurrencyLimit: 3,
    prefetchMode: PREFETCH_MODES.ALWAYS
  };

  const STORAGE_KEYS = {
    magnetCache: "magnetCache",
    cacheLimit: "cacheLimit",
    fetchDelay: "fetchDelay",
    concurrencyLimit: "concurrencyLimit",
    prefetchMode: "prefetchMode"
  };

  const SELECTORS = {
    isSinglePost: [".postContent > table"],
    postTitle: [".postTitle"],
    titleCandidates: [".postTitle h1", ".postTitle"],
    postRows: [".postContent table tr", ".torrent_info tr"],
    listLinks: [".postTitle a"],
    nativeMagnetLink: ["#magnetLink"]
  };

  const PARSER_FALLBACKS = {
    infoHashLabels: ["info hash", "hash"],
    trackerLabels: ["tracker", "announce url", "announce"]
  };

  ABBMA.core.constants = {
    ABB_DOMAINS,
    ABB_MATCH_PATTERNS,
    MAGNET_URI_SCHEME,
    TITLE_FALLBACK,
    PREFETCH_MODES,
    SETTINGS_DEFAULTS,
    STORAGE_KEYS,
    SELECTORS,
    PARSER_FALLBACKS
  };
})(window);
