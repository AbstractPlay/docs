#!/usr/bin/env node
/**
 * Extract samples object from renderer/test/playground.html
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VENDOR_RENDERER = fs.existsSync(path.join(ROOT, "vendor", "renderer", "test", "playground.html"))
  ? path.join(ROOT, "vendor", "renderer")
  : path.join(ROOT, "..", "renderer");

const playgroundPath = path.join(VENDOR_RENDERER, "test", "playground.html");
const outCatalog = path.join(ROOT, "src", "_data", "renderer-samples.json");
const outSamplesDir = path.join(VENDOR_RENDERER, "docs", "samples");

if (!fs.existsSync(playgroundPath)) {
  console.error("playground.html not found at", playgroundPath);
  process.exit(1);
}

const html = fs.readFileSync(playgroundPath, "utf8");
const startMarker = "var samples = ";
const startIdx = html.indexOf(startMarker);
if (startIdx === -1) {
  console.error("samples object not found in playground.html");
  process.exit(1);
}
let i = startIdx + startMarker.length;
while (html[i] === " ") i++;
if (html[i] !== "{") {
  console.error("Expected { after var samples =");
  process.exit(1);
}
let depth = 0;
let inString = false;
let stringChar = "";
let escape = false;
let endIdx = i;
for (; endIdx < html.length; endIdx++) {
  const c = html[endIdx];
  if (inString) {
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === stringChar) inString = false;
    continue;
  }
  if (c === '"' || c === "'" || c === "`") {
    inString = true;
    stringChar = c;
    continue;
  }
  if (c === "{") depth++;
  else if (c === "}") {
    depth--;
    if (depth === 0) {
      endIdx++;
      break;
    }
  }
}
const samplesExpr = html.slice(i, endIdx);

let samples;
try {
  // eslint-disable-next-line no-eval
  samples = eval("(" + samplesExpr + ")");
} catch (e) {
  console.error("Failed to eval samples:", e.message);
  process.exit(1);
}

fs.mkdirSync(outSamplesDir, { recursive: true });
fs.mkdirSync(path.dirname(outCatalog), { recursive: true });

const catalog = {};
for (const [key, sample] of Object.entries(samples)) {
  let renderJson = sample.render;
  if (typeof renderJson === "string") {
    try {
      renderJson = JSON.parse(renderJson);
    } catch {
      // keep string if template literal with unescaped content
    }
  }
  const filename = key + ".json";
  const outPath = path.join(outSamplesDir, filename);
  const toWrite = typeof renderJson === "object" ? JSON.stringify(renderJson, null, 2) : renderJson;
  fs.writeFileSync(outPath, toWrite);
  catalog[key] = {
    name: sample.name,
    description: sample.description,
    file: `samples/${filename}`,
  };
}

fs.writeFileSync(outCatalog, JSON.stringify(catalog, null, 2));
console.log(`Extracted ${Object.keys(catalog).length} samples to ${outSamplesDir}`);
