(function () {
  /**
   * AudioBookBay Magnet Assistant (ABBMA)
   * 
   * This content script enhances AudioBookBay pages by:
   * 1. Extracting torrent info hashes and trackers.
   * 2. Generating complete magnet links (even when logged out).
   * 3. Injecting a unified UI for downloading, copying, and appending links.
   * 4. Throttling pre-fetches on search/list pages to avoid rate-limiting.
   */

  // --- Configuration & Constants ---
  const MAGNET_URI_SCHEME = "magnet:?xt=urn:btih:";
  
  const SVG_ICONS = {
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
    append: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
  };

  const DEFAULTS = {
    CACHE_LIMIT: 100,
    FETCH_DELAY_MS: 1000,
    CONCURRENCY_LIMIT: 3,
    PREFETCH_MODE: 'Always'
  };

  // --- Utility Helpers ---
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Constructs a standard magnet URI from torrent metadata.
   * @param {Object} metadata - Extracted torrent info.
   * @returns {string} Fully formed magnet link.
   */
  function buildMagnetLink(metadata) {
    const { hash, title, trackers } = metadata;
    const base = `${MAGNET_URI_SCHEME}${hash}&dn=${encodeURIComponent(title)}`;
    const tr = trackers.length > 0 ? `&tr=${trackers.join("&tr=")}` : "";
    return base + tr;
  }

  /**
   * Scrapes metadata (hash, title, trackers) from a AudioBookBay page document.
   * @param {Document} doc - The document to parse.
   * @returns {Object|null} Metadata object or null if extraction fails.
   */
  function extractTorrentMetadata(doc) {
    const rows = Array.from(doc.querySelectorAll(".postContent table tr, .torrent_info tr"));
    let infoHash = null;
    const trackers = [];
    
    const titleNode = doc.querySelector(".postTitle h1, .postTitle");
    const cleanTitle = titleNode ? (titleNode.children[0] ? titleNode.children[0].textContent : titleNode.textContent).trim() : "Audiobook";

    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;
      const label = cells[0].textContent.trim();
      const value = cells[1].textContent.trim();
      
      if (label === "Tracker:" || label === "Announce URL:") trackers.push(value);
      else if (label === "Info Hash:") infoHash = value;
    });

    return infoHash ? { hash: infoHash, trackers, title: cleanTitle } : null;
  }

  // --- Storage & Cache Logic ---

  async function getCachedData(url) {
    const key = url.split("?")[0].split("#")[0]; // Normalize URL
    const store = await chrome.storage.local.get("magnetCache");
    return store.magnetCache ? store.magnetCache[key] : null;
  }

  async function cacheMagnetData(url, metadata) {
    const key = url.split("?")[0].split("#")[0];
    const store = await chrome.storage.local.get(["magnetCache", "cacheLimit"]);
    const cache = store.magnetCache || {};
    const limit = store.cacheLimit || DEFAULTS.CACHE_LIMIT;

    cache[key] = { ...metadata, timestamp: Date.now() };

    const keys = Object.keys(cache);
    if (keys.length > limit) {
      const oldestKey = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp)[0];
      delete cache[oldestKey];
    }

    await chrome.storage.local.set({ magnetCache: cache });
  }

  // --- UI Component Logic ---

  /**
   * Creates a unified button group for magnet link actions.
   * @returns {Object} Methods to manage the injected component.
   */
  function createMagnetUI() {
    const wrapper = document.createElement("div");
    wrapper.className = "abbma-wrapper";

    const btnGroup = document.createElement("div");
    btnGroup.className = "abbma-button-group";

    const statusText = document.createElement("span");
    statusText.setAttribute("aria-live", "polite");
    statusText.className = "abbma-status-text";

    let feedbackTimeout = null;
    const updateStatus = (msg, isPermanent = false) => {
      if (feedbackTimeout) clearTimeout(feedbackTimeout);
      
      // Reset transition to default (fade-in)
      statusText.classList.remove("abbma-fade-out");
      statusText.textContent = msg;
      statusText.style.opacity = "1";
      
      if (!isPermanent) {
        feedbackTimeout = setTimeout(() => {
          // Trigger slow fade-out via CSS class
          statusText.classList.add("abbma-fade-out");
          statusText.style.opacity = "0";
          
          setTimeout(() => {
            if (statusText.style.opacity === "0") {
              statusText.textContent = "";
              statusText.classList.remove("abbma-fade-out");
            }
          }, 600);
        }, 3000);
      }
    };

    const createIconButton = (svg, tooltip, positionClass) => {
      const btn = document.createElement("button");
      btn.innerHTML = svg;
      btn.title = tooltip;
      btn.className = "abbma-btn";
      if (positionClass) btn.classList.add(positionClass);
      
      btnGroup.appendChild(btn);
      return btn;
    };

    const dlBtn = createIconButton(SVG_ICONS.download, "Download Magnet", "abbma-btn-first");
    const cpBtn = createIconButton(SVG_ICONS.copy, "Copy to Clipboard", null);
    const apBtn = createIconButton(SVG_ICONS.append, "Append to Clipboard", "abbma-btn-last");

    wrapper.appendChild(btnGroup);
    wrapper.appendChild(statusText);

    return {
      element: wrapper,
      btnGroup,
      updateStatus,
      activate: (metadata) => {
        const link = buildMagnetLink(metadata);
        
        // Reset inline styles used for pending/on-demand states
        btnGroup.style.opacity = "";
        btnGroup.style.pointerEvents = "";
        btnGroup.style.cursor = "";
        
        btnGroup.classList.add("abbma-active");
        
        dlBtn.onclick = (e) => { e.stopPropagation(); window.location.href = link; };
        cpBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            await navigator.clipboard.writeText(link);
            updateStatus("Copied!");
          } catch (e) { updateStatus("Error!"); }
        };
        apBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            const current = await navigator.clipboard.readText().catch(() => "");
            if (current.includes(link)) return updateStatus("Duplicate!");
            await navigator.clipboard.writeText(current ? `${current}\n${link}` : link);
            updateStatus("Appended!");
          } catch (e) { updateStatus("Error!"); }
        };
      }
    };
  }

  // --- Fetch Logic ---

  /**
   * Fetches magnet data for a given URL and activates the UI.
   */
  async function fetchAndActivate(url, ui, delayMs = 0) {
    const cached = await getCachedData(url);
    if (cached) {
      ui.activate(cached);
      return true;
    }

    ui.updateStatus("Loading...", true);
    if (delayMs > 0) await sleep(delayMs);

    try {
      const response = await fetch(url);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const meta = extractTorrentMetadata(doc);
      if (meta) {
        await cacheMagnetData(url, meta);
        ui.activate(meta);
        ui.updateStatus("Ready");
        return true;
      } else {
        ui.updateStatus("Parse Error");
      }
    } catch (e) {
      ui.updateStatus("Network Error");
    }
    return false;
  }

  // --- Page Handlers ---

  async function processPostPage() {
    const postTitle = document.querySelector(".postTitle");
    if (!postTitle) return;

    const ui = createMagnetUI();
    ui.element.classList.add("abbma-post-wrapper");
    postTitle.parentNode.insertBefore(ui.element, postTitle);

    const metadata = extractTorrentMetadata(document);
    if (metadata) {
      await cacheMagnetData(window.location.href, metadata);
      ui.activate(metadata);
      const nativeLink = document.querySelector("#magnetLink");
      if (nativeLink) nativeLink.href = buildMagnetLink(metadata);
    } else {
      ui.updateStatus("Extraction Error");
    }
  }

  async function processListPage() {
    const bookLinks = Array.from(document.querySelectorAll(".postTitle a"));
    if (bookLinks.length === 0) return;

    const config = await chrome.storage.local.get(["fetchDelay", "concurrencyLimit", "prefetchMode"]);
    const delayMs = config.fetchDelay ?? DEFAULTS.FETCH_DELAY_MS;
    const workersCount = config.concurrencyLimit ?? DEFAULTS.CONCURRENCY_LIMIT;
    const mode = config.prefetchMode ?? DEFAULTS.PREFETCH_MODE;

    if (mode === 'Never') return;

    const taskQueue = bookLinks.map(link => {
      const ui = createMagnetUI();
      ui.element.classList.add("abbma-list-wrapper");
      link.parentNode.insertBefore(ui.element, link);
      
      const url = link.href;

      // Handle On-Demand modes
      if (mode === 'Hover') {
        ui.btnGroup.style.cursor = "wait";
        ui.btnGroup.addEventListener('mouseenter', () => fetchAndActivate(url, ui), { once: true });
      } else if (mode === 'Click') {
        ui.btnGroup.style.pointerEvents = "auto";
        ui.btnGroup.style.cursor = "pointer";
        ui.btnGroup.addEventListener('click', (e) => {
          e.stopPropagation();
          fetchAndActivate(url, ui);
        }, { once: true });
      }

      return { url, ui };
    });

    // Worker pool for 'Always' mode
    if (mode === 'Always') {
      async function fetchWorker() {
        while (taskQueue.length > 0) {
          const task = taskQueue.shift();
          if (!task) break;
          await fetchAndActivate(task.url, task.ui, delayMs);
        }
      }
      const pool = Array(workersCount).fill(null).map(() => fetchWorker());
      await Promise.all(pool);
    }
  }

  // --- Initialization ---

  async function init() {
    const isSinglePost = document.querySelector(".postContent > table") !== null;
    if (isSinglePost) {
      processPostPage();
    } else {
      processListPage();
    }
  }

  init().catch(err => console.error("ABBMA: Critical Initialization Failure", err));
})();
