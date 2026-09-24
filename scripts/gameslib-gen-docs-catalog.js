/**
 * Ephemeral gameslib catalog pages (meta-games.md, categories.md) for docs build/check.
 * Source narrative: vendor/gameslib/docs/categories.prose.md
 */
const { execFileSync } = require("child_process");
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

function catalogDepsRoot(docsRoot) {
  return path.join(docsRoot, "node_modules", ".cache", "gameslib-catalog");
}

function ensureGameslibDeps(docsRoot, gameslibRoot) {
  const installRoot = catalogDepsRoot(docsRoot);
  const tsMorph = path.join(installRoot, "node_modules", "ts-morph", "package.json");
  if (fs.existsSync(tsMorph)) {
    return path.join(installRoot, "node_modules");
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(gameslibRoot, "package.json"), "utf8"));
  const spec = pkg.devDependencies?.["ts-morph"] ?? "^27.0.2";
  console.log("Installing gameslib dependencies (ts-morph) for docs catalog...");
  // Catalog generation only needs ts-morph (public npm). `npm ci` in vendor/gameslib would
  // install @abstractplay/* from GitHub Packages and fails in docs CI without a gameslib .npmrc.
  fs.mkdirSync(installRoot, { recursive: true });
  execFileSync("npm", ["install", `ts-morph@${spec}`, "--ignore-scripts"], {
    cwd: installRoot,
    stdio: "inherit",
  });
  return path.join(installRoot, "node_modules");
}

/**
 * @param {string} docsRoot - AbstractPlay/docs repo root
 */
function generateGameslibDocsCatalog(docsRoot) {
  const gameslibRoot = resolveGameslibRoot(docsRoot);
  const script = path.join(gameslibRoot, "scripts", "gen-docs-catalog.mjs");
  const catalogNodeModules = ensureGameslibDeps(docsRoot, gameslibRoot);
  const env = { ...process.env };
  const nodePath = catalogNodeModules;
  env.NODE_PATH = env.NODE_PATH ? `${nodePath}${path.delimiter}${env.NODE_PATH}` : nodePath;
  execFileSync(process.execPath, [script], { cwd: gameslibRoot, stdio: "inherit", env });
  console.log("Generated gameslib docs catalog (meta-games.md, categories.md)");
}

module.exports = { generateGameslibDocsCatalog, resolveGameslibRoot };
