(function (global) {
  const optionsModule = global.ABBMA
    && global.ABBMA.ui
    && global.ABBMA.ui.options;

  if (!optionsModule || typeof optionsModule.init !== "function") {
    console.error("ABBMA: Options module failed to load.");
    return;
  }

  const run = () => {
    optionsModule.init().catch((err) => {
      console.error("ABBMA: Options initialization failure", err);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})(window);
