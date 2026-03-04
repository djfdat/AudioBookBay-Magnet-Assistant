(function () {
  /**
   * Audiobookbay Magnet Link Enhancer
   *
   * This script enhances audiobookbay.com pages by:
   * 1. Extracting torrent information (info hash and trackers) directly from the page.
   * 2. Constructing a complete magnet link.
   * 3. Adding a "Magnet Download" link and "Copy to Clipboard" / "Append to Clipboard" buttons
   *    near the post title for easy access.
   * 4. Providing user feedback for clipboard actions.
   * 5. Overriding the existing magnet link on the page to use the fully constructed one,
   *    ensuring it works even if the user is not logged in.
   */

  // --- Constants & Configuration ---
  const magnetPrefix = "magnet:?xt=urn:btih:";
  const linkSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  const clipboardSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>';
  const plusCircleSVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';

  let feedbackTimeoutId = null;
  let feedbackSpan = null;

  // --- Utility Functions ---
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Checks if the current page is an audiobook post page by looking for essential elements.
   * @returns {boolean}
   */
  function checkIfOnPostPage() {
    return (
      document.querySelector(".postTitle") !== null &&
      document.querySelector(".postContent > table") !== null
    );
  }

  /**
   * Displays a message to the user with a timed fade-in and fade-out effect.
   * @param {string} message - The message to display.
   */
  async function showFeedbackMessage(message) {
    if (!feedbackSpan) return;

    if (feedbackTimeoutId) {
      clearTimeout(feedbackTimeoutId);
    }

    feedbackSpan.textContent = message;
    feedbackSpan.style.transition = "opacity 0.2s ease-in";
    feedbackSpan.style.opacity = "1";

    feedbackTimeoutId = setTimeout(async () => {
      feedbackSpan.style.transition = "opacity 0.65s ease-out";
      feedbackSpan.style.opacity = "0";
      await delay(650);
      feedbackSpan.textContent = "";
    }, 4200);
  }

  /**
   * Extract torrent metadata using robust row-based selection.
   * @returns {{hash: string|null, trackers: string[]}}
   */
  function extractTorrentMetadata() {
    const tableRows = Array.from(document.querySelectorAll(".postContent table tr"));
    let hash = null;
    const trackers = [];

    tableRows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 2) return;

      const label = cells[0].textContent.trim();
      const value = cells[1].textContent.trim();

      if (label === "Tracker:" || label === "Announce URL:") {
        trackers.push(value);
      } else if (label === "Info Hash:") {
        hash = value;
      }
    });

    return { hash, trackers };
  }

  // --- Main Logic ---
  async function init() {
    if (!checkIfOnPostPage()) {
      return;
    }

    const titleElement = document.querySelector(".postTitle");
    const magnetLinkElement = document.querySelector("#magnetLink");
    const { hash, trackers } = extractTorrentMetadata();

    if (!hash) {
      console.warn("ABBMA: Info hash not found on this post page.");
      return;
    }

    const dn = titleElement.children[0] ? titleElement.children[0].innerHTML : "Audiobook";
    let link = `${magnetPrefix}${hash}&dn=${dn}`;

    if (trackers.length > 0) {
      link += `&tr=${trackers.join("&tr=")}`;
    }

    // Update existing magnet link if it exists
    if (magnetLinkElement) {
      magnetLinkElement.href = link;
    }

    // --- UI Creation ---
    const buttonGroup = document.createElement("div");
    Object.assign(buttonGroup.style, {
      backgroundColor: "#f0f0f0",
      borderRadius: "20px",
      display: "inline-flex",
      padding: "3px",
      alignItems: "center",
      marginBottom: "5px",
    });

    const createButton = (id, icon, title, isFirst = false, isLast = false) => {
      const btn = document.createElement(id === "magnetLink" ? "a" : "button");
      if (id === "magnetLink") {
        btn.href = link;
      } else {
        btn.id = id;
      }
      btn.innerHTML = icon;
      btn.title = title;
      Object.assign(btn.style, {
        background: "transparent",
        border: "none",
        padding: "5px",
        cursor: "pointer",
        lineHeight: "1",
        textDecoration: "none",
        borderTopLeftRadius: isFirst ? "17px" : "0",
        borderBottomLeftRadius: isFirst ? "17px" : "0",
        borderTopRightRadius: isLast ? "17px" : "0",
        borderBottomRightRadius: isLast ? "17px" : "0",
      });

      btn.onmouseover = () => (btn.style.backgroundColor = "#e0e0e0");
      btn.onmouseout = () => (btn.style.backgroundColor = "transparent");

      const svg = btn.querySelector("svg");
      if (svg) {
        Object.assign(svg.style, {
          width: "16px",
          height: "16px",
          verticalAlign: "middle",
          stroke: "#217e78",
        });
      }
      return btn;
    };

    const downloadBtn = createButton("magnetLink", linkSVG, "Magnet Download", true, false);
    const copyButton = createButton("copyToClipboardButton", clipboardSVG, "Copy to Clipboard");
    const appendButton = createButton("appendToClipboardButton", plusCircleSVG, "Append to Clipboard", false, true);

    buttonGroup.appendChild(downloadBtn);
    buttonGroup.appendChild(copyButton);
    buttonGroup.appendChild(appendButton);

    titleElement.parentNode.insertBefore(buttonGroup, titleElement);

    feedbackSpan = document.createElement("span");
    Object.assign(feedbackSpan.style, {
      marginLeft: "10px",
      fontSize: "0.9em",
      color: "#217e78",
      opacity: "0",
    });
    buttonGroup.parentNode.insertBefore(feedbackSpan, buttonGroup.nextSibling);

    if (!window.isSecureContext) {
      console.error("ABBMA: Clipboard API requires HTTPS.");
      showFeedbackMessage("Clipboard API requires HTTPS!");
      copyButton.style.display = "none";
      appendButton.style.display = "none";
      downloadBtn.style.borderTopRightRadius = "17px";
      downloadBtn.style.borderBottomRightRadius = "17px";
    }

    // --- Event Listeners ---
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(link);
        showFeedbackMessage("Copied!");
      } catch (err) {
        console.error("ABBMA: Error copying to clipboard", err);
        showFeedbackMessage("Error copying! Check permissions.");
      }
    });

    appendButton.addEventListener("click", async () => {
      let existingText = "";
      try {
        existingText = await navigator.clipboard.readText();
      } catch (err) {
        console.warn("ABBMA: Could not read clipboard", err);
      }

      const lines = existingText ? existingText.split("\n").map(l => l.trim()) : [];
      if (lines.includes(link.trim())) {
        const count = lines.filter(l => l.startsWith(magnetPrefix)).length;
        showFeedbackMessage(`Duplicate. Clipboard has ${count} link(s).`);
        return;
      }

      const newContent = existingText.trim() ? `${existingText}\n${link}` : link;
      try {
        await navigator.clipboard.writeText(newContent);
        const count = newContent.split("\n").filter(l => l.startsWith(magnetPrefix)).length;
        showFeedbackMessage(existingText.trim() ? `Appended. Total: ${count}` : `Copied. Total: 1`);
      } catch (err) {
        console.error("ABBMA: Error appending to clipboard", err);
        showFeedbackMessage("Error appending!");
      }
    });
  }

  // Initialize the script
  init().catch(err => console.error("ABBMA: Initialization error", err));
})();
