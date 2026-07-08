(function () {
  function renderWidget(el) {
    const textarea = el.querySelector(".render-widget-json");
    const svgHost = el.querySelector(".render-widget-svg");
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
      svgHost.innerHTML = "";
      try {
        svgHost.innerHTML = APRender.renderStatic(data, { prefix: prefix });
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

    doRender();
  }

  function init() {
    document.querySelectorAll(".render-widget").forEach(renderWidget);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
