#!/usr/bin/env node
/**
 * Write robots.txt and sitemap.xml into the Eleventy output (dist/).
 * Prod: block crawlers on source-like paths that 403; sitemap lists HTML doc pages only.
 * Dev: disallow all indexing.
 */
const fs = require("fs");
const path = require("path");
const {
  collectDocSlugs,
  loadNavOrder,
  buildSectionNav,
  nestNavBySlug,
} = require("./nav-utils");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");

const SITE_BASE = {
  prod: "https://docs.abstractplay.com",
  dev: "https://docs.dev.abstractplay.com",
};

/** Mirrors prebuild sync prefixes (content folder key → URL prefix). */
const DOC_SECTIONS = [
  { prefix: "gameslib", contentKey: "gameslib" },
  { prefix: "renderer", contentKey: "renderer" },
  { prefix: "backend", contentKey: "node-backend" },
  { prefix: "crons", contentKey: "crons" },
  { prefix: "recranks", contentKey: "recranks" },
  { prefix: "front", contentKey: "front" },
];

/** Google-supported robots wildcards; targets repo source paths, not HTML doc permalinks. */
const PROD_ROBOTS_DISALLOW = [
  "/*.ts$",
  "/*.tsx$",
  "/*.mts$",
  "/*.js.map$",
  "/package.json",
  "/*/package.json",
  "/serverless.yml",
  "/*/serverless.yml",
  "/pnpm-lock.yaml",
  "/*/pnpm-lock.yaml",
  "/tsconfig.json",
  "/*/tsconfig.json",
  "/*/lib/",
  "/*/src/",
  "/backend/api/",
  "/backend/test/",
  "/front/bin/",
];

function flattenNavUrls(nodes, out = []) {
  for (const node of nodes) {
    if (node.url) out.push(node.url);
    if (node.children?.length) flattenNavUrls(node.children, out);
  }
  return out;
}

function docsRootForSection(contentKey) {
  return path.join(CONTENT, contentKey, "docs");
}

function collectPublishedPaths() {
  const paths = new Set(["/"]);
  for (const { prefix, contentKey } of DOC_SECTIONS) {
    const docsRoot = docsRootForSection(contentKey);
    if (!fs.existsSync(docsRoot)) continue;
    const discovered = collectDocSlugs(docsRoot);
    const { order } = loadNavOrder(docsRoot);
    const flat = buildSectionNav(prefix, order, discovered);
    const nested = nestNavBySlug(flat);
    for (const url of flattenNavUrls(nested)) {
      paths.add(url);
    }
  }
  return [...paths].sort();
}

function buildRobotsTxt(stage) {
  if (stage !== "prod") {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  const base = SITE_BASE.prod;
  const lines = [
    "User-agent: *",
    ...PROD_ROBOTS_DISALLOW.map((rule) => `Disallow: ${rule}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ];
  return lines.join("\n");
}

function buildSitemapXml(stage, paths) {
  if (stage !== "prod") {
    return "";
  }
  const base = SITE_BASE.prod;
  const urls = paths
    .map(
      (p) =>
        `  <url><loc>${base}${p === "/" ? "/" : p}</loc></url>`,
    )
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

function writeSeoArtifacts(distDir, options = {}) {
  const stage = options.stage || process.env.DOCS_STAGE || "dev";
  const paths = collectPublishedPaths();
  const robots = buildRobotsTxt(stage);
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "robots.txt"), robots, "utf8");

  const sitemap = buildSitemapXml(stage, paths);
  if (sitemap) {
    fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap, "utf8");
  } else if (fs.existsSync(path.join(distDir, "sitemap.xml"))) {
    fs.unlinkSync(path.join(distDir, "sitemap.xml"));
  }

  return { stage, pathCount: paths.length };
}

if (require.main === module) {
  const distDir = process.env.DOCS_DIST || path.join(ROOT, "dist");
  if (!fs.existsSync(CONTENT)) {
    console.error("generate-seo: content/ missing — run prebuild first");
    process.exit(1);
  }
  const result = writeSeoArtifacts(distDir);
  console.log(
    `[generate-seo] Wrote robots.txt (${result.stage}) and sitemap (${result.pathCount} URLs) -> ${distDir}`,
  );
}

module.exports = {
  PROD_ROBOTS_DISALLOW,
  buildRobotsTxt,
  buildSitemapXml,
  collectPublishedPaths,
  writeSeoArtifacts,
};
