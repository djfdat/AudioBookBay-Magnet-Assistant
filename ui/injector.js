(function (global) {
  const ABBMA = global.ABBMA = global.ABBMA || {};
  ABBMA.ui = ABBMA.ui || {};

  const constants = ABBMA.core && ABBMA.core.constants;
  const magnet = ABBMA.core && ABBMA.core.magnet;
  const parser = ABBMA.core && ABBMA.core.parser;
  const cache = ABBMA.core && ABBMA.core.cache;
  const fetchQueue = ABBMA.core && ABBMA.core.fetchQueue;
  const browserApi = ABBMA.platform && ABBMA.platform.browserApi;

  if (!constants || !magnet || !parser || !cache || !fetchQueue || !browserApi) {
    throw new Error("ABBMA: Required modules are unavailable before loading ui/injector.js");
  }

  const SVG_ICONS = {
    download: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/></svg>",
    copy: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\" ry=\"1\"/></svg>",
    append: "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"16\"/><line x1=\"8\" y1=\"12\" x2=\"16\" y2=\"12\"/></svg>"
  };

  function queryFirst(selectors) {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node) {
        return node;
      }
    }
    return null;
  }

  function queryAll(selectors) {
    const seen = new Set();
    const nodes = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!seen.has(node)) {
          seen.add(node);
          nodes.push(node);
        }
      });
    });
    return nodes;
  }

  function createMagnetUI() {
    const wrapper = document.createElement("div");
    wrapper.className = "abbma-wrapper";

    const btnGroup = document.createElement("div");
    btnGroup.className = "abbma-button-group";

    const statusText = document.createElement("span");
    statusText.setAttribute("aria-live", "polite");
    statusText.className = "abbma-status-text";

    let feedbackTimeout = null;
    const updateStatus = (message, isPermanent = false) => {
      if (feedbackTimeout) {
        clearTimeout(feedbackTimeout);
      }

      statusText.classList.remove("abbma-fade-out");
      statusText.textContent = message;
      statusText.style.opacity = "1";

      if (!isPermanent) {
        feedbackTimeout = setTimeout(() => {
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
      const button = document.createElement("button");
      button.innerHTML = svg;
      button.title = tooltip;
      button.className = "abbma-btn";
      if (positionClass) {
        button.classList.add(positionClass);
      }

      btnGroup.appendChild(button);
      return button;
    };

    const downloadButton = createIconButton(SVG_ICONS.download, "Download Magnet", "abbma-btn-first");
    const copyButton = createIconButton(SVG_ICONS.copy, "Copy to Clipboard", null);
    const appendButton = createIconButton(SVG_ICONS.append, "Append to Clipboard", "abbma-btn-last");

    wrapper.appendChild(btnGroup);
    wrapper.appendChild(statusText);

    return {
      element: wrapper,
      btnGroup,
      updateStatus,
      activate: (metadata) => {
        const magnetLink = magnet.buildMagnetLink(metadata);
        btnGroup.style.opacity = "";
        btnGroup.style.pointerEvents = "";
        btnGroup.style.cursor = "";
        btnGroup.classList.add("abbma-active");

        downloadButton.onclick = (event) => {
          event.stopPropagation();
          global.location.href = magnetLink;
        };

        copyButton.onclick = async (event) => {
          event.stopPropagation();
          try {
            await browserApi.clipboard.writeText(magnetLink);
            updateStatus("Copied!");
          } catch (_err) {
            updateStatus("Error!");
          }
        };

        appendButton.onclick = async (event) => {
          event.stopPropagation();
          try {
            const current = await browserApi.clipboard.readText().catch(() => "");
            if (current.includes(magnetLink)) {
              updateStatus("Duplicate!");
              return;
            }
            await browserApi.clipboard.writeText(current ? `${current}\n${magnetLink}` : magnetLink);
            updateStatus("Appended!");
          } catch (_err) {
            updateStatus("Error!");
          }
        };
      }
    };
  }

  async function fetchAndActivate(url, ui, delayMs = 0) {
    const cached = await cache.getCachedData(url);
    if (cached) {
      ui.activate(cached);
      return true;
    }

    ui.updateStatus("Loading...", true);
    const result = await fetchQueue.fetchMagnetMetadata(url, { delayMs });

    if (result.ok) {
      ui.activate(result.metadata);
      ui.updateStatus("Ready");
      return true;
    }

    ui.updateStatus(result.errorType === "parse" ? "Parse Error" : "Network Error");
    return false;
  }

  async function processPostPage() {
    const postTitle = queryFirst(constants.SELECTORS.postTitle);
    if (!postTitle || !postTitle.parentNode) {
      return;
    }

    const ui = createMagnetUI();
    ui.element.classList.add("abbma-post-wrapper");
    postTitle.parentNode.insertBefore(ui.element, postTitle);

    const metadata = parser.extractTorrentMetadata(document);
    if (metadata) {
      await cache.cacheMagnetData(global.location.href, metadata);
      ui.activate(metadata);

      const nativeMagnetLink = queryFirst(constants.SELECTORS.nativeMagnetLink);
      if (nativeMagnetLink) {
        nativeMagnetLink.href = magnet.buildMagnetLink(metadata);
      }
      return;
    }

    ui.updateStatus("Extraction Error");
  }

  async function processListPage() {
    const bookLinks = queryAll(constants.SELECTORS.listLinks);
    if (bookLinks.length === 0) {
      return;
    }

    const settings = await cache.loadSettingsWithDefaults();
    const delayMs = settings.fetchDelay;
    const workersCount = settings.concurrencyLimit;
    const mode = settings.prefetchMode;

    if (mode === constants.PREFETCH_MODES.NEVER) {
      return;
    }

    const taskQueue = bookLinks.map((link) => {
      const ui = createMagnetUI();
      ui.element.classList.add("abbma-list-wrapper");
      link.parentNode.insertBefore(ui.element, link);

      const url = link.href;
      if (mode === constants.PREFETCH_MODES.HOVER) {
        ui.btnGroup.style.cursor = "wait";
        ui.btnGroup.addEventListener("mouseenter", () => {
          void fetchAndActivate(url, ui);
        }, { once: true });
      } else if (mode === constants.PREFETCH_MODES.CLICK) {
        ui.btnGroup.style.pointerEvents = "auto";
        ui.btnGroup.style.cursor = "pointer";
        ui.btnGroup.addEventListener("click", (event) => {
          event.stopPropagation();
          void fetchAndActivate(url, ui);
        }, { once: true });
      }

      return { url, ui };
    });

    if (mode === constants.PREFETCH_MODES.ALWAYS) {
      await fetchQueue.runWorkerPool(taskQueue, workersCount, async (task) => {
        await fetchAndActivate(task.url, task.ui, delayMs);
      });
    }
  }

  function isSinglePostPage() {
    return constants.SELECTORS.isSinglePost.some((selector) => document.querySelector(selector) !== null);
  }

  async function init() {
    if (isSinglePostPage()) {
      await processPostPage();
      return;
    }

    await processListPage();
  }

  ABBMA.ui.injector = {
    init
  };
})(window);
