const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { nestNavBySlug } = require("./nav-utils");

function item(slug, title = null) {
  const leaf = slug.split("/").pop().replace(/-/g, " ");
  return {
    slug,
    title: title || leaf.replace(/\b\w/g, (c) => c.toUpperCase()),
    url: slug === "index" ? "/section/" : `/section/${slug}/`,
  };
}

function slugs(nodes) {
  return nodes.map((node) => node.slug);
}

describe("nestNavBySlug", () => {
  it("keeps flat items at the root", () => {
    const tree = nestNavBySlug([item("index"), item("architecture")]);
    assert.deepEqual(slugs(tree), ["index", "architecture"]);
    assert.equal(tree[0].depth, 0);
    assert.equal(tree[1].depth, 0);
  });

  it("nests children under a real parent slug", () => {
    const tree = nestNavBySlug([item("helpers", "Helpers"), item("helpers/rect-grid", "RectGrid")]);
    assert.deepEqual(slugs(tree), ["helpers"]);
    assert.deepEqual(slugs(tree[0].children), ["helpers/rect-grid"]);
    assert.equal(tree[0].children[0].depth, 1);
  });

  it("creates implicit groups for orphan path prefixes", () => {
    const tree = nestNavBySlug([
      item("api/overview", "API overview"),
      item("api/public-queries", "Public queries"),
    ]);
    assert.deepEqual(slugs(tree), ["api"]);
    assert.equal(tree[0].url, null);
    assert.equal(tree[0].implicit, true);
    assert.deepEqual(slugs(tree[0].children), ["api/overview", "api/public-queries"]);
  });

  it("keeps sibling prefixes under the same parent", () => {
    const tree = nestNavBySlug([
      item("helpers", "Helpers"),
      item("helpers/graphs", "Graph classes"),
      item("helpers/graphs-square", "Square graphs"),
    ]);
    assert.deepEqual(slugs(tree[0].children), ["helpers/graphs", "helpers/graphs-square"]);
    assert.equal(tree[0].children[0].depth, 1);
    assert.equal(tree[0].children[1].depth, 1);
  });

  it("preserves order within groups", () => {
    const tree = nestNavBySlug([
      item("index"),
      item("api/overview", "API overview"),
      item("api/auth-queries", "Auth queries"),
      item("bots", "Bots"),
      item("bots/protocol", "Protocol"),
    ]);
    assert.deepEqual(slugs(tree), ["index", "api", "bots"]);
    assert.deepEqual(slugs(tree[1].children), ["api/overview", "api/auth-queries"]);
    assert.deepEqual(slugs(tree[2].children), ["bots/protocol"]);
  });

  it("merges a real parent page into an existing implicit group", () => {
    const tree = nestNavBySlug([
      item("api/overview", "API overview"),
      item("api", "API"),
    ]);
    assert.deepEqual(slugs(tree), ["api"]);
    assert.equal(tree[0].url, "/section/api/");
    assert.equal(tree[0].implicit, false);
    assert.deepEqual(slugs(tree[0].children), ["api/overview"]);
  });
});
