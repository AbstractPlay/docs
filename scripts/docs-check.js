#!/usr/bin/env node
/**
 * Verify documentation drift against authoritative sources.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const WARN_ONLY = process.env.DOCS_CHECK_WARN === "1";

let errors = [];
let warnings = [];

const resolvedRepos = new Map();

function resolveRepo(name) {
  if (resolvedRepos.has(name)) return resolvedRepos.get(name);

  const vendor = path.join(ROOT, "vendor", name);
  const sibling = path.join(ROOT, "..", name);
  const minDocs = { gameslib: 10, renderer: 8 }[name] || 1;

  function repoDocCount(repoRoot) {
    const docsRoot = path.join(repoRoot, "docs");
    if (!fs.existsSync(docsRoot)) return 0;
    let count = 0;
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".md") && !entry.name.startsWith("_")) count++;
      }
    })(docsRoot);
    return count;
  }

  const hasVendor = fs.existsSync(path.join(vendor, "package.json"));
  const hasSibling = fs.existsSync(path.join(sibling, "package.json"));
  const vendorDocs = hasVendor ? repoDocCount(vendor) : 0;
  const siblingDocs = hasSibling ? repoDocCount(sibling) : 0;

  let chosen;
  if (hasVendor && vendorDocs >= minDocs) {
    chosen = vendor;
  } else if (hasVendor && vendorDocs > 0 && vendorDocs < minDocs) {
    if (hasSibling && siblingDocs >= minDocs) {
      warn(
        `${name}: vendor/${name} has only ${vendorDocs} doc page(s) (expected ≥${minDocs}); ` +
          `checking ../${name} instead — run \`npm run vendor:sync\` for CI parity`
      );
      chosen = sibling;
    } else {
      fail(
        `${name}: vendor/${name} docs incomplete (${vendorDocs} page(s), expected ≥${minDocs}). ` +
          "Run: npm run vendor:sync"
      );
      chosen = vendor;
    }
  } else if (hasSibling) {
    chosen = sibling;
  } else if (hasVendor) {
    chosen = vendor;
  } else {
    throw new Error(`Cannot find ${name} at vendor/${name} or ../${name}`);
  }

  resolvedRepos.set(name, chosen);
  return chosen;
}

function fail(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function checkRendererSchema() {
  const schemaPath = path.join(resolveRepo("renderer"), "src", "schemas", "schema.json");
  const refPath = path.join(resolveRepo("renderer"), "docs", "schema-reference", "index.md");
  if (!fs.existsSync(schemaPath)) {
    warn("renderer schema.json missing");
    return;
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const engines = schema.properties?.renderer?.enum || [];
  if (!fs.existsSync(refPath)) {
    fail("renderer schema-reference/index.md not generated");
    return;
  }
  const ref = fs.readFileSync(refPath, "utf8");
  for (const e of engines) {
    if (!ref.includes(`\`${e}\``)) {
      fail(`Engine '${e}' missing from schema-reference`);
    }
  }
}

function checkGameBaseManifest() {
  const basePath = path.join(resolveRepo("gameslib"), "src", "games", "_base.ts");
  const manifestPath = path.join(resolveRepo("gameslib"), "docs", "_game-object-manifest.yaml");
  if (!fs.existsSync(basePath)) return;
  if (!fs.existsSync(manifestPath)) {
    warn("docs/_game-object-manifest.yaml missing");
    return;
  }

  const base = fs.readFileSync(basePath, "utf8");
  const manifest = fs.readFileSync(manifestPath, "utf8");
  const abstractMethods = [...base.matchAll(/public abstract (\w+)\(/g)].map((m) => m[1]);
  for (const method of abstractMethods) {
    if (!manifest.includes(method)) {
      fail(`GameBase method '${method}' not in _game-object-manifest.yaml`);
    }
  }
}

function checkHelperExamples() {
  const examplesPath = path.join(resolveRepo("gameslib"), "docs", "helpers", "_examples.json");
  if (!fs.existsSync(examplesPath)) {
    warn("helpers/_examples.json not generated");
    return;
  }
  const examples = JSON.parse(fs.readFileSync(examplesPath, "utf8"));
  const gamesDir = path.join(resolveRepo("gameslib"), "src", "games");
  for (const [, uids] of Object.entries(examples)) {
    for (const uid of uids) {
      const gameFile = path.join(gamesDir, `${uid}.ts`);
      if (!fs.existsSync(gameFile)) {
        fail(`Example game '${uid}' in _examples.json does not exist`);
      }
    }
  }
}

function checkCitedGames() {
  const helpersDir = path.join(resolveRepo("gameslib"), "docs", "helpers");
  if (!fs.existsSync(helpersDir)) return;
  const gamesDir = path.join(resolveRepo("gameslib"), "src", "games");
  const re = /(?:games\/([a-z0-9_-]+)\.ts|play\.abstractplay\.com\/games\/([a-z0-9_-]+))/g;
  for (const file of fs.readdirSync(helpersDir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(helpersDir, file), "utf8");
    let m;
    while ((m = re.exec(content)) !== null) {
      const uid = m[1] || m[2];
      if (!fs.existsSync(path.join(gamesDir, `${uid}.ts`))) {
        fail(`Cited game '${uid}' in helpers/${file} does not exist`);
      }
    }
  }
}

function checkRendererSamples() {
  const samplesDir = path.join(resolveRepo("renderer"), "docs", "samples");
  if (!fs.existsSync(samplesDir)) {
    warn("renderer docs/samples not found — run npm run extract-samples");
    return;
  }
  const files = fs.readdirSync(samplesDir).filter((f) => f.endsWith(".json"));
  if (files.length < 10) {
    warn(`Only ${files.length} renderer samples found`);
  }
  for (const f of files) {
    try {
      JSON.parse(fs.readFileSync(path.join(samplesDir, f), "utf8"));
    } catch (e) {
      fail(`Invalid JSON in samples/${f}: ${e.message}`);
    }
  }
}

const DOC_ASSET_URLS = new Set(["/gameslib/templates/new-game-template.ts"]);

function docUrl(repoPrefix, relPath) {
  const slug = relPath
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "index");
  return slug === "index" ? `/${repoPrefix}/` : `/${repoPrefix}/${slug}/`;
}

function collectDocPages(docsRoot, repoPrefix) {
  const pages = new Map();
  function walk(dir, base = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(base, entry.name).replace(/\\/g, "/");
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
        pages.set(docUrl(repoPrefix, rel), full);
      }
    }
  }
  walk(docsRoot);
  return pages;
}

function resolveDocLink(pageUrl, href) {
  const pathPart = href.split("#")[0];
  if (!pathPart || pathPart.startsWith("http") || pathPart.startsWith("mailto:")) return null;
  if (pathPart.startsWith("/")) return pathPart;
  const base = pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`;
  return new URL(pathPart, `http://local${base}`).pathname;
}

function isPublishedDocTarget(pathOnly, pageUrls) {
  if (pageUrls.has(pathOnly)) return true;
  if (!pathOnly.endsWith("/") && pageUrls.has(`${pathOnly}/`)) return true;
  if (DOC_ASSET_URLS.has(pathOnly)) return true;
  if (/^\/renderer\/samples\/.*\.json$/.test(pathOnly)) return true;
  return false;
}

function checkAllInternalDocLinks() {
  const repos = [
    ["renderer", "renderer"],
    ["gameslib", "gameslib"],
  ];
  const allPages = new Map();

  for (const [repoName, repoPrefix] of repos) {
    const docsRoot = path.join(resolveRepo(repoName), "docs");
    if (!fs.existsSync(docsRoot)) {
      warn(`${repoName} docs/ missing — skip link check`);
      continue;
    }
    for (const [url, filePath] of collectDocPages(docsRoot, repoPrefix)) {
      allPages.set(url, filePath);
    }
  }

  const pageUrls = new Set(allPages.keys());
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;

  for (const [pageUrl, filePath] of allPages) {
    const content = fs.readFileSync(filePath, "utf8");
    let match;
    while ((match = linkRe.exec(content)) !== null) {
      const href = match[2].trim();
      if (!href || href.startsWith("#") || href.startsWith("{%") || /^https?:/.test(href) || href.startsWith("mailto:")) {
        continue;
      }
      const resolved = resolveDocLink(pageUrl, href);
      if (!resolved) continue;
      if (!isPublishedDocTarget(resolved, pageUrls)) {
        const relFile = path.relative(ROOT, filePath).replace(/\\/g, "/");
        fail(`Broken doc link in ${relFile}: […](${href}) resolves to ${resolved} (page is ${pageUrl})`);
      }
    }
  }
}

checkRendererSchema();
checkGameBaseManifest();
checkHelperExamples();
checkCitedGames();
checkRendererSamples();
checkAllInternalDocLinks();

for (const w of warnings) console.warn("WARN:", w);
for (const e of errors) console.error("ERROR:", e);

if (errors.length > 0 && !WARN_ONLY) {
  console.error(`\ndocs:check failed with ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`docs:check passed (${warnings.length} warning(s))`);
