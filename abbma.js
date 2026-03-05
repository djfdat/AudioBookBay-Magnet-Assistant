(function (global) {
  const injector = global.ABBMA
    && global.ABBMA.ui
    && global.ABBMA.ui.injector;

  if (!injector || typeof injector.init !== "function") {
    console.error("ABBMA: UI injector module failed to load.");
    return;
  }

  injector.init().catch((err) => {
    console.error("ABBMA: Critical Initialization Failure", err);
  });
})(window);
