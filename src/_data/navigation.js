const fs = require("fs");
const path = require("path");
const {
  collectDocSlugs,
  loadNavOrder,
  buildSectionNav,
} = require("../../scripts/nav-utils");

const ROOT = path.join(__dirname, "../..");

function docsDir(prefix) {
  for (const candidate of [
    path.join(ROOT, "src", prefix),
    path.join(ROOT, "content", prefix, "docs"),
  ]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function sectionNav(prefix) {
  const dir = docsDir(prefix);
  const discovered = collectDocSlugs(dir);
  const { order } = loadNavOrder(dir);
  return buildSectionNav(prefix, order, discovered);
}

module.exports = function () {
  return [
    { title: "Home", url: "/" },
    {
      title: "Renderer",
      url: "/renderer/",
      children: sectionNav("renderer"),
    },
    {
      title: "Gameslib",
      url: "/gameslib/",
      children: sectionNav("gameslib"),
    },
  ];
};
