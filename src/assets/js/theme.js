(function () {
  const STORAGE_KEY = "color-mode";
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");

  function getMode() {
    return root.getAttribute("color-mode") === "dark" ? "dark" : "light";
  }

  function setMode(mode) {
    root.setAttribute("color-mode", mode);
    localStorage.setItem(STORAGE_KEY, mode);
    updateToggle(mode);
  }

  function updateToggle(mode) {
    if (!toggle) return;
    const isLight = mode === "light";
    const label = isLight ? "Toggle dark mode" : "Toggle light mode";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
    const icon = toggle.querySelector(".theme-toggle-icon");
    if (icon) icon.textContent = isLight ? "\u263E" : "\u263C";
  }

  if (toggle) {
    updateToggle(getMode());
    toggle.addEventListener("click", function () {
      setMode(getMode() === "light" ? "dark" : "light");
    });
  }
})();
