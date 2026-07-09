#!/usr/bin/env node
/**
 * Prebuild: sync vendor docs into Eleventy input, generate schema refs, build APRender from renderer.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const ASSETS_JS = path.join(ROOT, "src", "assets", "js");

const VENDOR_FALLBACKS = {
  renderer: path.join(ROOT, "..", "renderer"),
  gameslib: path.join(ROOT, "..", "gameslib"),
  "node-backend": path.join(ROOT, "..", "node-backend"),
  recranks: path.join(ROOT, "..", "recranks"),
  "backend-crons": path.join(ROOT, "..", "backend-crons"),
  front: path.join(ROOT, "..", "front"),
};

function resolveVendor(name) {
  const fallback = VENDOR_FALLBACKS[name];
  const vendorPath = path.join(ROOT, "vendor", name);
  const vendorDocs = path.join(vendorPath, "docs", "nav.json");
  const fallbackDocs = fallback ? path.join(fallback, "docs", "nav.json") : null;

  if (fs.existsSync(vendorDocs)) return vendorPath;
  if (fallbackDocs && fs.existsSync(fallbackDocs)) {
    console.warn(`vendor/${name} docs missing; using sibling ${fallback}`);
    return fallback;
  }
  if (fs.existsSync(path.join(vendorPath, "package.json"))) return vendorPath;
  if (fallback && fs.existsSync(path.join(fallback, "package.json"))) {
    console.warn(`vendor/${name} missing; using sibling ${fallback}`);
    return fallback;
  }
  throw new Error(`Cannot find ${name} at vendor/${name} or ${fallback}`);
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest, options = {}) {
  if (!fs.existsSync(src)) {
    console.warn(`Skip copy: ${src} does not exist`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, options);
    } else if (entry.isFile()) {
      if (options.filter && !options.filter(s)) continue;
      fs.copyFileSync(s, d);
    }
  }
}

function injectFrontmatter(filePath, meta) {
  const body = fs.readFileSync(filePath, "utf8");
  if (body.startsWith("---")) return;
  const lines = ["---"];
  for (const [k, v] of Object.entries(meta)) {
    if (typeof v === "boolean") lines.push(`${k}: ${v}`);
    else if (typeof v === "string") lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
    else lines.push(`${k}: ${v}`);
  }
  lines.push("---", "");
  fs.writeFileSync(filePath, lines.join("\n") + body);
}

function syncDocs(repoName, prefix, useWidget) {
  const vendorRoot = resolveVendor(repoName);
  const srcDocs = path.join(vendorRoot, "docs");
  const destDocs = path.join(CONTENT, repoName, "docs");
  rmrf(path.join(CONTENT, repoName));
  copyDir(srcDocs, destDocs, {
    filter: (f) => !f.endsWith(".adoc") && !path.basename(f).startsWith("_"),
  });

  function walkMd(dir, base = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(base, entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkMd(full, rel);
      } else if (entry.name.endsWith(".md")) {
        const slug = rel.replace(/\\/g, "/").replace(/\.md$/, "").replace(/\/index$/, "").replace(/^index$/, "index");
        const permalink = slug === "index" ? `/${prefix}/` : `/${prefix}/${slug}/`;
        const meta = {
          layout: "layouts/base.njk",
          permalink,
          title: path.basename(slug),
        };
        if (useWidget) meta.useRenderWidget = true;
        injectFrontmatter(full, meta);
      }
    }
  }
  walkMd(destDocs);
  console.log(`Synced ${repoName} docs -> content/${repoName}/docs`);
}

function fetchAPRender(rendererRoot) {
  fs.mkdirSync(ASSETS_JS, { recursive: true });
  const dest = path.join(ASSETS_JS, "APRender.min.js");
  const distBundle = path.join(rendererRoot, "dist", "APRender.min.js");
  const distScript = process.env.DOCS_STAGE === "prod" ? "dist-prod" : "dist-dev";
  const cdnUrl =
    process.env.DOCS_STAGE === "prod"
      ? "https://renderer.abstractplay.com/APRender.min.js"
      : "https://renderer.dev.abstractplay.com/APRender.min.js";

  function copyBundle() {
    if (!fs.existsSync(distBundle)) return false;
    fs.copyFileSync(distBundle, dest);
    return true;
  }

  if (copyBundle()) {
    console.log("Copied APRender.min.js from renderer dist");
    return;
  }

  try {
    console.log(`Building APRender.min.js in renderer (${distScript})...`);
    execSync("npm ci", { cwd: rendererRoot, stdio: "inherit" });
    execSync(`npm run ${distScript}`, { cwd: rendererRoot, stdio: "inherit" });
    if (copyBundle()) {
      console.log("Built and copied APRender.min.js from renderer");
      return;
    }
  } catch (e) {
    console.warn("Could not build APRender in renderer:", e.message);
  }

  try {
    console.log(`Downloading APRender.min.js from renderer playground (${cdnUrl})...`);
    execSync(`curl -fsSL "${cdnUrl}" -o "${dest}"`, { cwd: ROOT, shell: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size < 1000) {
      throw new Error("Downloaded file missing or too small");
    }
    console.log("Fetched APRender.min.js from renderer playground");
  } catch (e) {
    console.warn("Could not fetch APRender.min.js:", e.message);
    fs.writeFileSync(
      dest,
      "/* APRender placeholder - run npm run dist-dev in renderer or deploy renderer playground */"
    );
  }
}

// Main
fs.mkdirSync(CONTENT, { recursive: true });
if (fs.existsSync(path.join(ROOT, "dist"))) {
  fs.rmSync(path.join(ROOT, "dist"), { recursive: true, force: true });
}
syncDocs("renderer", "renderer", true);
syncDocs("gameslib", "gameslib", false);
syncDocs("node-backend", "backend", false);
syncDocs("recranks", "recranks", false);
syncDocs("backend-crons", "crons", false);
syncDocs("front", "front", false);

execSync("node scripts/generate-schema-ref.js", { cwd: ROOT, stdio: "inherit" });
execSync("node scripts/generate-helper-examples.js", { cwd: ROOT, stdio: "inherit" });

const rendererRoot = resolveVendor("renderer");
fetchAPRender(rendererRoot);

// Point Eleventy at merged content via symlink-style copy into src
const srcRenderer = path.join(ROOT, "src", "renderer");
const srcGameslib = path.join(ROOT, "src", "gameslib");
const srcBackend = path.join(ROOT, "src", "backend");
const srcRecranks = path.join(ROOT, "src", "recranks");
const srcCrons = path.join(ROOT, "src", "crons");
const srcFront = path.join(ROOT, "src", "front");
rmrf(srcRenderer);
rmrf(srcGameslib);
rmrf(srcBackend);
rmrf(srcRecranks);
rmrf(srcCrons);
rmrf(srcFront);
copyDir(path.join(CONTENT, "renderer", "docs"), srcRenderer);
copyDir(path.join(resolveVendor("renderer"), "docs", "samples"), path.join(srcRenderer, "samples"));
copyDir(path.join(CONTENT, "gameslib", "docs"), srcGameslib);
copyDir(path.join(CONTENT, "node-backend", "docs"), srcBackend);
copyDir(path.join(CONTENT, "recranks", "docs"), srcRecranks);
copyDir(path.join(CONTENT, "backend-crons", "docs"), srcCrons);
copyDir(path.join(CONTENT, "front", "docs"), srcFront);

console.log("Prebuild complete.");
