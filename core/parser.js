(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const constants = ABBMA.core.constants;
  const magnet = ABBMA.core.magnet;

  // Parser requires constants for selectors/labels and magnet for metadata normalization.
  if (!constants || !magnet) {
    throw new Error("ABBMA: core/constants.js and core/magnet.js must be loaded before core/parser.js");
  }

  function queryFirstBySelectors(doc, selectors) {
    // Ordered fallback querying protects against markup drift across ABB mirrors.
    for (const selector of selectors) {
      const node = doc.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function queryAllBySelectors(doc, selectors) {
    // Deduplicate nodes because selector fallbacks may overlap on some templates.
    const seen = new Set();
    const nodes = [];
    selectors.forEach((selector) => {
      doc.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      });
    });
    return nodes;
  }

  function normalizeLabel(labelText) {
    // Normalize punctuation and casing so parser labels can match site variants
    // without maintaining large duplicate label sets.
    return String(labelText || "")
      .trim()
      .replace(/:+$/g, "")
      .trim()
      .toLowerCase();
  }

  function extractTitle(doc) {
    // Some layouts wrap title text in child nodes; prefer first child text when present.
    const titleNode = queryFirstBySelectors(doc, constants.SELECTORS.titleCandidates);
    if (!titleNode) {
      return constants.TITLE_FALLBACK;
    }

    if (titleNode.children && titleNode.children[0]) {
      return titleNode.children[0].textContent.trim() || constants.TITLE_FALLBACK;
    }

    return titleNode.textContent.trim() || constants.TITLE_FALLBACK;
  }

  function extractTorrentMetadata(doc) {
    // Parse table rows so metadata extraction remains resilient to field order changes.
    const rows = queryAllBySelectors(doc, constants.SELECTORS.postRows);
    let infoHash = null;
    const trackers = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) {
        return;
      }

      const label = normalizeLabel(cells[0].textContent);
      const value = String(cells[1].textContent || "").trim();
      if (!value) {
        return;
      }

      if (constants.PARSER_FALLBACKS.trackerLabels.includes(label)) {
        trackers.push(value);
      } else if (constants.PARSER_FALLBACKS.infoHashLabels.includes(label)) {
        infoHash = value;
      }
    });

    // Hash is mandatory to build a valid magnet URI; fail cleanly when unavailable.
    if (!infoHash) {
      return null;
    }

    // Return normalized metadata so callers can construct magnet links directly.
    return magnet.normalizeMetadata({
      hash: infoHash,
      trackers,
      title: extractTitle(doc)
    });
  }

  // Export only the high-level parse API; keep traversal helpers internal.
  ABBMA.core.parser = {
    extractTorrentMetadata
  };
})(window);
