(function () {
  const PLAYGROUND_ORIGIN = "https://renderer.dev.abstractplay.com";

  function encodeBase64Url(str) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  function playgroundUrl(json) {
    return PLAYGROUND_ORIGIN + "/?json=" + encodeBase64Url(json);
  }

  function colourContextForPage() {
    if (window.APDocsColourContext) return window.APDocsColourContext.forPage();
    const mode = document.documentElement.getAttribute("color-mode") || "light";
    return mode === "dark"
      ? {
          background: "#222",
          strokes: "#6d6d6d",
          borders: "#000",
          labels: "#009fbf",
          annotations: "#99cccc",
          fill: "#e6f2f2",
        }
      : {
          background: "#fff",
          strokes: "#000",
          borders: "#000",
          labels: "#000",
          annotations: "#000",
          fill: "#000",
        };
  }

  const widgets = [];

  function renderWidget(el) {
    const textarea = el.querySelector(".render-widget-json");
    const svgHost = el.querySelector(".render-widget-svg");
    const preview = el.querySelector(".render-widget-preview");
    const errorEl = el.querySelector(".render-widget-error");
    const defaultJson = textarea.value;
    const prefix = el.id ? el.id + "-" : "rw-" + Math.random().toString(36).slice(2, 10) + "-";
    let debounceTimer;

    function showError(msg) {
      errorEl.hidden = !msg;
      errorEl.textContent = msg || "";
    }

    function doRender() {
      if (typeof APRender === "undefined") {
        showError("APRender library not loaded.");
        return;
      }
      if (typeof APRender.renderStatic !== "function") {
        showError("APRender.renderStatic not available.");
        return;
      }
      let data;
      try {
        data = JSON.parse(textarea.value);
        showError("");
      } catch (e) {
        showError("JSON parse error: " + e.message);
        return;
      }

      const colourContext = colourContextForPage();
      if (preview) preview.style.backgroundColor = colourContext.background;

      svgHost.innerHTML = "";
      try {
        svgHost.innerHTML = APRender.renderStatic(data, {
          prefix: prefix,
          colourContext: colourContext,
        });
      } catch (e) {
        showError("Render error: " + e.message);
      }
    }

    function onInput() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doRender, 400);
    }

    textarea.addEventListener("input", onInput);

    el.querySelector(".rw-prettify")?.addEventListener("click", () => {
      try {
        textarea.value = JSON.stringify(JSON.parse(textarea.value), null, 2);
        doRender();
      } catch (e) {
        showError("Cannot prettify: " + e.message);
      }
    });

    el.querySelector(".rw-reset")?.addEventListener("click", () => {
      textarea.value = defaultJson;
      doRender();
    });

    el.querySelector(".rw-playground")?.addEventListener("click", () => {
      try {
        JSON.parse(textarea.value);
        window.open(playgroundUrl(textarea.value), "_blank", "noopener,noreferrer");
      } catch (e) {
        showError("Cannot open playground: " + e.message);
      }
    });

    widgets.push({ doRender });
    doRender();
  }

  function init() {
    document.querySelectorAll(".render-widget").forEach(renderWidget);

    if (!window.__apDocsRenderWidgetThemeObserver) {
      window.__apDocsRenderWidgetThemeObserver = new MutationObserver(function () {
        widgets.forEach(function (w) {
          w.doRender();
        });
      });
      window.__apDocsRenderWidgetThemeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["color-mode"],
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
