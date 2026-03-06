(function (global) {
  // Thin bootstrap: keep runtime wiring separate from feature logic so
  // content-script startup stays predictable and easy to debug.
  const injector = global.ABBMA
    && global.ABBMA.ui
    && global.ABBMA.ui.injector;

  // Fail fast when dependency ordering breaks, instead of silently running
  // a partially initialized extension on production pages.
  if (!injector || typeof injector.init !== "function") {
    console.error("ABBMA: UI injector module failed to load.");
    return;
  }

  // Bubble initialization errors to the console so users can report a clear failure signal.
  injector.init().catch((err) => {
    console.error("ABBMA: Critical Initialization Failure", err);
  });
})(window);
