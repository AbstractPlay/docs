const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const CONTENT = path.join(ROOT, "content");

function renderWidgetHtml(samplePath) {
  const fullPath = path.join(CONTENT, "renderer/docs", samplePath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(ROOT, "..", "renderer", "docs", samplePath);
  }
  let defaultJson = "{}";
  if (fs.existsSync(fullPath)) {
    defaultJson = fs.readFileSync(fullPath, "utf8").trim();
  }
  const id = "rw-" + Math.random().toString(36).slice(2, 10);
  const escaped = defaultJson
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div class="render-widget" id="${id}" data-default="${escaped}">
  <div class="render-widget-panels">
    <div class="render-widget-editor">
      <div class="render-widget-toolbar">
        <button type="button" class="rw-btn rw-prettify">Prettify</button>
        <button type="button" class="rw-btn rw-reset">Reset</button>
        <button type="button" class="rw-btn rw-playground">Open in playground</button>
      </div>
      <textarea class="render-widget-json" spellcheck="false">${escaped}</textarea>
      <div class="render-widget-error" hidden></div>
    </div>
    <div class="render-widget-preview">
      <div class="render-widget-svg"></div>
    </div>
  </div>
</div>`;
}

module.exports = function (eleventyConfig) {
  // Prebuild writes generated docs into gitignored src/renderer and src/gameslib.
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/renderer/samples": "renderer/samples" });
  eleventyConfig.addPassthroughCopy({ "src/renderer/contact-sheet.svg": "renderer/contact-sheet.svg" });
  eleventyConfig.addPassthroughCopy({ "src/renderer/fonts": "renderer/fonts" });
  eleventyConfig.addPassthroughCopy({ "src/gameslib/templates": "gameslib/templates" });

  eleventyConfig.addShortcode("renderWidget", renderWidgetHtml);

  eleventyConfig.addTransform("renderWidgetMd", function (content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) return content;
    return content.replace(/\{% renderWidget "([^"]+)" %\}/g, (_, samplePath) => renderWidgetHtml(samplePath));
  });

  eleventyConfig.addFilter("githubGameLink", (uid) => {
    return `https://github.com/AbstractPlay/gameslib/blob/develop/src/games/${uid}.ts`;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "dist",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
};
