(function () {
  const LIGHT = {
    background: "#fff",
    strokes: "#000",
    borders: "#000",
    labels: "#000",
    annotations: "#000",
    fill: "#000",
  };

  const DARK = {
    background: "#222",
    strokes: "#6d6d6d",
    borders: "#000",
    labels: "#009fbf",
    annotations: "#99cccc",
    fill: "#e6f2f2",
  };

  function forPage() {
    const mode = document.documentElement.getAttribute("color-mode") || "light";
    return mode === "dark" ? DARK : LIGHT;
  }

  window.APDocsColourContext = { LIGHT, DARK, forPage };
})();
