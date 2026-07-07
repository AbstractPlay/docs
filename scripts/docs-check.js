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

function resolveRepo(name) {
  const vendor = path.join(ROOT, "vendor", name);
  const sibling = path.join(ROOT, "..", name);
  if (fs.existsSync(path.join(vendor, "package.json"))) return vendor;
  return sibling;
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
  const docPath = path.join(resolveRepo("gameslib"), "docs", "game-object.md");
  if (!fs.existsSync(basePath) || !fs.existsSync(docPath)) return;

  const base = fs.readFileSync(basePath, "utf8");
  const doc = fs.readFileSync(docPath, "utf8");
  const abstractMethods = [...base.matchAll(/public abstract (\w+)\(/g)].map((m) => m[1]);
  const manifestMatch = doc.match(/```yaml manifest\n([\s\S]*?)```/);
  if (!manifestMatch) {
    warn("game-object.md missing yaml manifest block");
    return;
  }
  const manifest = manifestMatch[1];
  for (const method of abstractMethods) {
    if (!manifest.includes(method)) {
      fail(`GameBase method '${method}' not in game-object.md manifest`);
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
  const re = /games\/([a-z0-9_-]+)\.ts/g;
  for (const file of fs.readdirSync(helpersDir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(helpersDir, file), "utf8");
    let m;
    while ((m = re.exec(content)) !== null) {
      const uid = m[1];
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

checkRendererSchema();
checkGameBaseManifest();
checkHelperExamples();
checkCitedGames();
checkRendererSamples();

for (const w of warnings) console.warn("WARN:", w);
for (const e of errors) console.error("ERROR:", e);

if (errors.length > 0 && !WARN_ONLY) {
  console.error(`\ndocs:check failed with ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`docs:check passed (${warnings.length} warning(s))`);
