/**
 * Ephemeral gameslib catalog pages (meta-games.md, categories.md) for docs build/check.
 * Source narrative: vendor/gameslib/docs/categories.prose.md
 */
const { execFileSync, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function resolveGameslibRoot(docsRoot) {
  const candidates = [
    path.join(docsRoot, "vendor", "gameslib"),
    path.join(docsRoot, "..", "gameslib"),
  ];
  for (const root of candidates) {
    const script = path.join(root, "scripts", "gen-docs-catalog.mjs");
    const prose = path.join(root, "docs", "categories.prose.md");
    if (fs.existsSync(script) && fs.existsSync(prose)) return root;
  }
  throw new Error(
    "gameslib gen-docs-catalog not found — need scripts/gen-docs-catalog.mjs and docs/categories.prose.md in vendor/gameslib or ../gameslib",
  );
}

function ensureGameslibDeps(gameslibRoot) {
  const tsMorph = path.join(gameslibRoot, "node_modules", "ts-morph", "package.json");
  if (fs.existsSync(tsMorph)) return;
  console.log("Installing gameslib dependencies (ts-morph) for docs catalog...");
  execSync("npm ci", { cwd: gameslibRoot, stdio: "inherit" });
}

/**
 * @param {string} docsRoot - AbstractPlay/docs repo root
 */
function generateGameslibDocsCatalog(docsRoot) {
  const gameslibRoot = resolveGameslibRoot(docsRoot);
  const script = path.join(gameslibRoot, "scripts", "gen-docs-catalog.mjs");
  ensureGameslibDeps(gameslibRoot);
  execFileSync(process.execPath, [script], { cwd: gameslibRoot, stdio: "inherit" });
  console.log("Generated gameslib docs catalog (meta-games.md, categories.md)");
}

module.exports = { generateGameslibDocsCatalog, resolveGameslibRoot };
