#!/usr/bin/env node
/**
 * Scan gameslib games for common/ imports and emit helpers/_examples.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const gameslib = fs.existsSync(path.join(ROOT, "vendor", "gameslib", "src"))
  ? path.join(ROOT, "vendor", "gameslib")
  : path.join(ROOT, "..", "gameslib");

const gamesDir = path.join(gameslib, "src", "games");
const outPath = path.join(gameslib, "docs", "helpers", "_examples.json");

if (!fs.existsSync(gamesDir)) {
  console.warn("gameslib src/games not found");
  process.exit(0);
}

const map = {};

function add(helper, uid) {
  if (!map[helper]) map[helper] = [];
  if (!map[helper].includes(uid)) map[helper].push(uid);
}

const importRe = /from\s+["'](\.\.\/common(?:\/[^"']*)?)["']/g;

for (const file of fs.readdirSync(gamesDir)) {
  if (!file.endsWith(".ts") || file.startsWith("_")) continue;
  const uid = file.replace(/\.ts$/, "");
  const content = fs.readFileSync(path.join(gamesDir, file), "utf8");
  let m;
  while ((m = importRe.exec(content)) !== null) {
    const mod = m[1].replace(/^\.\.\/common\/?/, "") || "index";
    const key = mod === "index" ? "common" : mod.replace(/^graphs\//, "graphs.");
    add(key, uid);
  }
  // Named imports from barrel on one line
  const barrel = content.match(/import\s+\{([^}]+)\}\s+from\s+["']\.\.\/common["']/);
  if (barrel) {
    for (const sym of barrel[1].split(",")) {
      const name = sym.trim().split(/\s+as\s+/)[0].trim();
      if (name) add(name, uid);
    }
  }
}

for (const k of Object.keys(map)) {
  map[k].sort();
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(`Wrote ${outPath} (${Object.keys(map).length} helpers)`);

// Regenerate examples/by-feature.md table section
const examplesMd = path.join(gameslib, "docs", "examples", "by-feature.md");
fs.mkdirSync(path.dirname(examplesMd), { recursive: true });

const lines = [
  "---",
  "layout: layouts/base.njk",
  "permalink: /gameslib/examples/by-feature/",
  "title: Examples by feature",
  "---",
  "",
  "# Examples by feature",
  "",
  "Cross-index of helpers and modules to games that import them. Auto-generated from source imports.",
  "",
  "| Helper / module | Example games |",
  "| --- | --- |",
];

const sorted = Object.keys(map).sort();
for (const helper of sorted) {
  const games = map[helper]
    .slice(0, 8)
    .map((g) => `[${g}](https://github.com/AbstractPlay/gameslib/blob/develop/src/games/${g}.ts)`)
    .join(", ");
  const more = map[helper].length > 8 ? ` (+${map[helper].length - 8} more)` : "";
  lines.push(`| \`${helper}\` | ${games}${more} |`);
}

fs.writeFileSync(examplesMd, lines.join("\n") + "\n");
console.log("Updated examples/by-feature.md");
