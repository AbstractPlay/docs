const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PROD_ROBOTS_DISALLOW,
  buildRobotsTxt,
  buildSitemapXml,
} = require("./generate-seo");

describe("generate-seo", () => {
  it("blocks all crawlers on dev", () => {
    const robots = buildRobotsTxt("dev");
    assert.match(robots, /Disallow: \//);
    assert.doesNotMatch(robots, /Sitemap:/);
  });

  it("prod robots disallows TypeScript and repo layout paths", () => {
    const robots = buildRobotsTxt("prod");
    assert.match(robots, /Disallow: \/\*\.ts\$/);
    assert.match(robots, /Disallow: \/\*\/lib\//);
    assert.match(robots, /Sitemap: https:\/\/docs\.abstractplay\.com\/sitemap\.xml/);
    for (const rule of PROD_ROBOTS_DISALLOW) {
      assert.ok(robots.includes(`Disallow: ${rule}`), `missing rule ${rule}`);
    }
  });

  it("prod sitemap lists only given doc paths", () => {
    const xml = buildSitemapXml("prod", ["/", "/front/getting-started/"]);
    assert.match(xml, /<loc>https:\/\/docs\.abstractplay\.com\/<\/loc>/);
    assert.match(xml, /<loc>https:\/\/docs\.abstractplay\.com\/front\/getting-started\/<\/loc>/);
    assert.doesNotMatch(xml, /\.ts</);
  });

  it("dev sitemap is omitted", () => {
    assert.equal(buildSitemapXml("dev", ["/"]), "");
  });
});
