(function (global) {
  // Thin options bootstrap: page orchestration stays here while settings logic
  // remains in ui/options.js for testable separation.
  const optionsModule = global.ABBMA
    && global.ABBMA.ui
    && global.ABBMA.ui.options;

  // Hard-stop when required modules are missing so broken option pages fail loudly.
  if (!optionsModule || typeof optionsModule.init !== "function") {
    console.error("ABBMA: Options module failed to load.");
    return;
  }

  // Wrap init in a callable so we can reuse it for both ready-state paths.
  const run = () => {
    optionsModule.init().catch((err) => {
      console.error("ABBMA: Options initialization failure", err);
    });
  };

  // Guard against script-order differences: run immediately if DOM is ready,
  // otherwise delay until content is available.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})(window);
