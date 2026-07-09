const fs = require("fs");
const path = require("path");

function relPathToSlug(relPath) {
  return relPath
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/^index$/, "index");
}

function slugToUrl(prefix, slug) {
  if (slug === "index") return `/${prefix}/`;
  return `/${prefix}/${slug}/`;
}

function urlToSlug(prefix, url) {
  const base = `/${prefix}/`;
  if (url === base) return "index";
  if (!url.startsWith(base)) return null;
  return url.slice(base.length).replace(/\/$/, "");
}

function defaultTitle(slug) {
  if (slug === "index") return "Overview";
  const leaf = slug.split("/").pop();
  return leaf.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function titleFromMarkdown(content) {
  const body = content.startsWith("---") ? content.replace(/^---[\s\S]*?---\n*/, "") : content;
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function collectDocSlugs(docsRoot) {
  const slugs = new Map();
  if (!docsRoot || !fs.existsSync(docsRoot)) return slugs;

  function walk(dir, base = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(base, entry.name).replace(/\\/g, "/");
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, rel);
      } else if (entry.name.endsWith(".md") && !entry.name.startsWith("_")) {
        const slug = relPathToSlug(rel);
        const content = fs.readFileSync(full, "utf8");
        slugs.set(slug, { filePath: full, title: titleFromMarkdown(content) });
      }
    }
  }

  walk(docsRoot);
  return slugs;
}

function loadNavOrder(docsRoot) {
  const navPath = path.join(docsRoot, "nav.json");
  if (!fs.existsSync(navPath)) return { order: [], source: null };
  return {
    order: JSON.parse(fs.readFileSync(navPath, "utf8")),
    source: navPath,
  };
}

function navConfigLabel(navPath) {
  if (!navPath) return "docs/nav.json";
  const docsRoot = path.basename(navPath) === "nav.json" ? path.dirname(navPath) : navPath;
  const repo = path.basename(path.dirname(docsRoot));
  return `${repo}/docs/nav.json`;
}

function normalizeNavItem(item) {
  if (typeof item === "string") return { slug: item, title: null };
  return { slug: item.slug, title: item.title || null };
}

/**
 * Build nav children: explicit order from config, then any unlisted pages alphabetically.
 */
function buildSectionNav(prefix, orderConfig, discoveredSlugs) {
  const result = [];
  const used = new Set();

  for (const raw of orderConfig) {
    const { slug, title: configTitle } = normalizeNavItem(raw);
    if (!slug || !discoveredSlugs.has(slug)) continue;
    used.add(slug);
    const discovered = discoveredSlugs.get(slug);
    result.push({
      slug,
      title: configTitle || discovered.title || defaultTitle(slug),
      url: slugToUrl(prefix, slug),
    });
  }

  const unlisted = [...discoveredSlugs.keys()].filter((slug) => !used.has(slug));
  unlisted.sort((a, b) => {
    const ta = discoveredSlugs.get(a).title || defaultTitle(a);
    const tb = discoveredSlugs.get(b).title || defaultTitle(b);
    return ta.localeCompare(tb);
  });

  for (const slug of unlisted) {
    const discovered = discoveredSlugs.get(slug);
    result.push({
      slug,
      title: discovered.title || defaultTitle(slug),
      url: slugToUrl(prefix, slug),
    });
  }

  return result;
}

function isSlugParent(parentSlug, childSlug) {
  return childSlug.startsWith(`${parentSlug}/`);
}

function findNodeBySlug(nodes, slug) {
  return nodes.find((node) => node.slug === slug);
}

function createImplicitGroup(slug, depth) {
  return {
    slug,
    title: defaultTitle(slug),
    url: null,
    implicit: true,
    children: [],
    depth,
  };
}

/**
 * Convert a flat ordered nav list into a tree using slug path prefixes.
 * Creates implicit non-link group nodes when a parent slug has no page entry.
 */
function nestNavBySlug(flatItems) {
  const roots = [];
  const stack = [];

  for (const item of flatItems) {
    const slug = item.slug;
    if (!slug) {
      roots.push({ ...item, children: [], depth: 0 });
      continue;
    }

    while (stack.length > 0 && !isSlugParent(stack[stack.length - 1].slug, slug)) {
      stack.pop();
    }

    let parentChildren = roots;
    let depth = 0;

    if (stack.length > 0) {
      parentChildren = stack[stack.length - 1].node.children;
      depth = stack[stack.length - 1].node.depth + 1;
    } else if (slug.includes("/")) {
      const parts = slug.split("/");
      for (let i = 1; i < parts.length; i++) {
        const ancestorSlug = parts.slice(0, i).join("/");
        const stackEntry = stack.find((entry) => entry.slug === ancestorSlug);
        if (stackEntry) {
          parentChildren = stackEntry.node.children;
          depth = stackEntry.node.depth + 1;
          continue;
        }

        let ancestorNode = findNodeBySlug(parentChildren, ancestorSlug);
        if (!ancestorNode) {
          ancestorNode = createImplicitGroup(ancestorSlug, depth);
          parentChildren.push(ancestorNode);
        } else {
          depth = ancestorNode.depth + 1;
        }

        stack.push({ slug: ancestorSlug, node: ancestorNode });
        parentChildren = ancestorNode.children;
        depth = ancestorNode.depth + 1;
      }
    }

    const existing = findNodeBySlug(parentChildren, slug);
    if (existing && existing.implicit) {
      existing.title = item.title;
      existing.url = item.url;
      existing.implicit = false;
      stack.push({ slug, node: existing });
      continue;
    }

    const node = {
      slug,
      title: item.title,
      url: item.url,
      implicit: false,
      children: [],
      depth,
    };

    parentChildren.push(node);
    stack.push({ slug, node });
  }

  return roots;
}

function validateNavConfig(prefix, configLabel, orderConfig, discoveredSlugs, { fail, warn }) {
  const listedSlugs = new Set();

  for (const raw of orderConfig) {
    const { slug } = normalizeNavItem(raw);
    if (!slug) {
      fail(`Nav entry missing slug in ${configLabel}`);
      continue;
    }
    const url = slugToUrl(prefix, slug);
    if (listedSlugs.has(slug)) fail(`Duplicate nav entry ${url} in ${configLabel}`);
    listedSlugs.add(slug);
    if (!discoveredSlugs.has(slug)) {
      fail(`Nav entry ${url} in ${configLabel} has no matching doc page`);
    }
  }

  for (const slug of discoveredSlugs.keys()) {
    if (!listedSlugs.has(slug)) {
      const url = slugToUrl(prefix, slug);
      const title = discoveredSlugs.get(slug).title || defaultTitle(slug);
      warn(
        `Doc page ${url} ("${title}") is not in ${configLabel} — it will appear at the end of the nav; add its slug to set order`
      );
    }
  }
}

module.exports = {
  relPathToSlug,
  slugToUrl,
  urlToSlug,
  defaultTitle,
  titleFromMarkdown,
  collectDocSlugs,
  loadNavOrder,
  navConfigLabel,
  buildSectionNav,
  nestNavBySlug,
  validateNavConfig,
};
