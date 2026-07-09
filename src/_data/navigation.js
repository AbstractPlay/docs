const fs = require("fs");
const path = require("path");
const {
  collectDocSlugs,
  loadNavOrder,
  buildSectionNav,
} = require("../../scripts/nav-utils");

const ROOT = path.join(__dirname, "../..");

const CONTENT_DOC_DIRS = {
  renderer: path.join(ROOT, "content", "renderer", "docs"),
  gameslib: path.join(ROOT, "content", "gameslib", "docs"),
  backend: path.join(ROOT, "content", "node-backend", "docs"),
  recranks: path.join(ROOT, "content", "recranks", "docs"),
  crons: path.join(ROOT, "content", "backend-crons", "docs"),
};

function docsDir(prefix) {
  for (const candidate of [
    path.join(ROOT, "src", prefix),
    CONTENT_DOC_DIRS[prefix],
    path.join(ROOT, "content", prefix, "docs"),
  ]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function sectionNav(prefix) {
  const dir = docsDir(prefix);
  if (!dir) return [];
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
    {
      title: "Backend",
      url: "/backend/",
      children: sectionNav("backend"),
    },
    {
      title: "Recranks",
      url: "/recranks/",
      children: sectionNav("recranks"),
    },
    {
      title: "Crons",
      url: "/crons/",
      children: sectionNav("crons"),
    },
  ];
};
