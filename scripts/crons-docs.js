/**
 * Crons documentation lives under node-backend/crons/docs (monorepo), not a separate repo.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CRONS_DOCS_MIN = 8;

function countMdDocs(docsRoot) {
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

/**
 * @param {string} nodeBackendRoot - vendor or sibling node-backend checkout
 * @param {{ warn?: (msg: string) => void }} [options]
 */
function resolveCronsDocsRoot(nodeBackendRoot, options = {}) {
  const cronsDocs = path.join(nodeBackendRoot, "crons", "docs");
  if (fs.existsSync(path.join(cronsDocs, "nav.json"))) {
    const count = countMdDocs(cronsDocs);
    if (count < CRONS_DOCS_MIN) {
      throw new Error(
        `node-backend/crons/docs incomplete (${count} page(s), expected ≥${CRONS_DOCS_MIN}) at ${cronsDocs}`
      );
    }
    return cronsDocs;
  }

  const siblingNb = path.join(ROOT, "..", "node-backend");
  const siblingCrons = path.join(siblingNb, "crons", "docs");
  if (
    siblingNb !== nodeBackendRoot
    && fs.existsSync(path.join(siblingCrons, "nav.json"))
  ) {
    const count = countMdDocs(siblingCrons);
    if (count < CRONS_DOCS_MIN) {
      throw new Error(
        `../node-backend/crons/docs incomplete (${count} page(s), expected ≥${CRONS_DOCS_MIN})`
      );
    }
    options.warn?.(
      "crons: vendor/node-backend has no crons/docs yet; using ../node-backend/crons/docs — run `npm run vendor:sync` after monorepo merge"
    );
    return siblingCrons;
  }

  throw new Error(
    `Cannot find crons docs at ${cronsDocs} or ${siblingCrons} (expected node-backend/crons/docs with nav.json)`
  );
}

module.exports = { resolveCronsDocsRoot, countMdDocs, CRONS_DOCS_MIN };
