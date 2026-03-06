# Foundation Refactor

This document describes the modular architecture introduced in v4.x of AudioBookBay Magnet Assistant.

## Motivation

The extension previously lived in two flat files (`abbma.js` and `options.js`) that mixed parsing, magnet construction, caching, fetch scheduling, UI injection, and settings management together. Any change to ABB domain patterns, page selectors, or parser labels required edits across multiple unrelated code paths.

The refactor splits the codebase into focused modules with explicit dependency ordering, a centralized configuration layer, and thin bootstrap entry points.

## Directory Layout

```
├── platform/
│   └── browser-api.js        # Browser abstraction layer
├── core/
│   ├── constants.js           # Centralized configuration & selectors
│   ├── magnet.js              # Magnet URI construction
│   ├── parser.js              # Page scraping / metadata extraction
│   ├── cache.js               # Storage-backed magnet cache
│   └── fetch-queue.js         # Throttled fetch scheduling & worker pool
├── ui/
│   ├── injector.js            # Content script UI (post & list pages)
│   └── options.js             # Options page logic
├── abbma.js                   # Content script bootstrap (thin)
├── options.js                 # Options page bootstrap (thin)
├── abbma.css                  # Injected styles
├── options.html               # Options page markup
└── manifest.json              # MV3 manifest with ordered script loading
```

## Module Responsibilities

### `platform/browser-api.js`

Provides a unified interface over browser extension APIs. Detects the runtime namespace (`browser` vs `chrome`) and exposes:

- `storage.get(keys)` / `storage.set(values)` — wraps `storage.local`
- `clipboard.writeText(text)` / `clipboard.readText()` — wraps `navigator.clipboard`

No domain logic lives here. All other modules access browser APIs through this layer.

### `core/constants.js`

Single source of truth for all shared configuration:

- **`ABB_DOMAINS`** — Array of known AudioBookBay domain variants.
- **`ABB_MATCH_PATTERNS`** — Derived URL match patterns (mirrors `manifest.json` entries).
- **`SELECTORS`** — Ordered fallback arrays for every DOM query (post title, torrent rows, list links, native magnet link, single-post detection).
- **`PARSER_FALLBACKS`** — Normalized label sets for info-hash and tracker row detection.
- **`SETTINGS_DEFAULTS`** — Default values for all user-facing settings.
- **`STORAGE_KEYS`** — String constants for `chrome.storage` keys.
- **`PREFETCH_MODES`** — Enum-like object for prefetch mode values.
- **`MAGNET_URI_SCHEME`** / **`TITLE_FALLBACK`** — Magnet link and title constants.

When ABB adds a new domain or changes page markup, only this file needs updating.

### `core/magnet.js`

Pure functions for magnet link handling:

- `normalizeMetadata(metadata)` — Sanitizes hash, title, and tracker arrays.
- `buildMagnetLink(metadata)` — Constructs a complete `magnet:` URI from metadata.

### `core/parser.js`

Stateless document parser driven entirely by `constants.SELECTORS` and `constants.PARSER_FALLBACKS`:

- `extractTorrentMetadata(doc)` — Accepts any `Document`, returns `{ hash, title, trackers }` or `null`.

Labels are matched after normalization (lowercased, trailing colons stripped), so markup like `Info Hash:`, `Info Hash`, or `info hash:` all resolve correctly.

### `core/cache.js`

Manages the bounded magnet-link cache in extension storage:

- `getCachedData(url)` — Looks up cached metadata by normalized URL key.
- `cacheMagnetData(url, metadata)` — Stores metadata with a timestamp; evicts the oldest entry when the cache exceeds the configured limit.
- `loadSettingsWithDefaults()` — Reads all user settings from storage, falling back to `SETTINGS_DEFAULTS`.
- `clearCache()` / `getCacheCount()` — Cache maintenance helpers used by the options page.

### `core/fetch-queue.js`

Handles throttled fetching and concurrency control for list-page prefetching:

- `fetchMagnetMetadata(url, { delayMs })` — Checks cache first, then fetches and parses the page. Returns a result object with `{ ok, metadata, errorType, fromCache }`.
- `runWorkerPool(items, workersCount, workerFn)` — Generic bounded-concurrency worker pool.

### `ui/injector.js`

Content-script UI layer. Creates the button group (download / copy / append), handles status feedback with fade animations, and orchestrates the two page flows:

- **Post page** — Extracts metadata from the current document, injects controls above the title, and patches the native magnet link.
- **List page** — Injects controls next to each book link and delegates fetching to the configured prefetch mode (Hover / Click / Never).

### `ui/options.js`

Options page controller. Binds input/range syncing, save/reset/clear actions, and cache statistics display. Reads defaults and storage keys from `core/constants.js` and accesses storage through `platform/browser-api.js`.

## Bootstrap Entry Points

### `abbma.js` (content script)

Loaded last in the `manifest.json` content script array. Its only job is to call `ABBMA.ui.injector.init()` and log any critical errors.

### `options.js` (options page)

Loaded last in `options.html`. Calls `ABBMA.ui.options.init()` after `DOMContentLoaded`.

## Script Load Order

Modules communicate through the `window.ABBMA` namespace. Each module registers itself on this object and guards against missing dependencies with an early throw. The load order is enforced by the script array in `manifest.json` (content scripts) and the `<script>` tag order in `options.html`.

**Content scripts** (`manifest.json`):

```
platform/browser-api.js
core/constants.js
core/magnet.js
core/parser.js
core/cache.js
core/fetch-queue.js
ui/injector.js
abbma.js
```

**Options page** (`options.html`):

```
platform/browser-api.js
core/constants.js
core/cache.js
ui/options.js
options.js
```

## Adding a New ABB Domain

1. Add the domain string to `ABB_DOMAINS` in `core/constants.js`.
2. Add the corresponding `*://*.newdomain.tld/*` entries to `host_permissions` and `content_scripts[].matches` in `manifest.json`.

No other files need changes.

## Adding a Parser Fallback

To handle a new label variant (e.g., a site redesign renames "Info Hash:" to "Hash Value:"):

1. Add the normalized label (`"hash value"`) to `PARSER_FALLBACKS.infoHashLabels` in `core/constants.js`.

The parser will pick it up automatically.
