(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.core = ABBMA.core || {};

  const constants = ABBMA.core.constants;
  const magnet = ABBMA.core.magnet;

  if (!constants || !magnet) {
    throw new Error("ABBMA: core/constants.js and core/magnet.js must be loaded before core/parser.js");
  }

  function queryFirstBySelectors(doc, selectors) {
    for (const selector of selectors) {
      const node = doc.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function queryAllBySelectors(doc, selectors) {
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
    return String(labelText || "")
      .trim()
      .replace(/:+$/g, "")
      .trim()
      .toLowerCase();
  }

  function extractTitle(doc) {
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

    if (!infoHash) {
      return null;
    }

    return magnet.normalizeMetadata({
      hash: infoHash,
      trackers,
      title: extractTitle(doc)
    });
  }

  ABBMA.core.parser = {
    extractTorrentMetadata
  };
})(window);
