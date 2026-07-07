#!/usr/bin/env node
/**
 * Generate schema reference markdown from schema.json files.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function resolveRepo(name) {
  const vendor = path.join(ROOT, "vendor", name);
  const sibling = path.join(ROOT, "..", name);
  if (fs.existsSync(path.join(vendor, "package.json"))) return vendor;
  return sibling;
}

function mdTable(headers, rows) {
  const lines = [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.join(" | ") + " |"),
  ];
  return lines.join("\n");
}

function generateRendererSchemaRef() {
  const schemaPath = path.join(resolveRepo("renderer"), "src", "schemas", "schema.json");
  if (!fs.existsSync(schemaPath)) {
    console.warn("renderer schema.json not found");
    return;
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const outDir = path.join(resolveRepo("renderer"), "docs", "schema-reference");
  fs.mkdirSync(outDir, { recursive: true });

  const version = (schema.$id || "").match(/(\d+-\d+-\d+)/)?.[1]?.replace(/-/g, ".") || "unknown";
  const engines = schema.properties?.renderer?.enum || [];
  const boardStylesDef = schema.$defs?.boardStyles || schema.definitions?.boardStyles;
  const boardStyles = boardStylesDef?.enum || [];
  const options = schema.properties?.options?.items?.enum || [];

  let md = `---
layout: layouts/base.njk
permalink: /renderer/schema-reference/
title: Schema reference
useRenderWidget: true
generated: true
schemaVersion: ${version}
---

# Schema reference (v${version})

Auto-generated from \`schema.json\`. Narrative documentation is in the other renderer pages.

## Top-level properties

${mdTable(["Property", "Required", "Description"], [
  ["renderer", "no", schema.properties?.renderer?.description || ""],
  ["board", "yes", schema.properties?.board?.description || "Game board definition"],
  ["pieces", "yes", schema.properties?.pieces?.description || "Piece placement"],
  ["legend", "no", schema.properties?.legend?.description || "Glyph legend"],
  ["areas", "no", schema.properties?.areas?.description || "Side panel areas"],
  ["annotations", "no", schema.properties?.annotations?.description || "Move annotations"],
  ["options", "no", schema.properties?.options?.description || "Renderer flags"],
])}

## Renderer engines <span id="engines"></span>

${mdTable(["Engine"], engines.map((e) => [`\`${e}\``]))}

## Board styles <span id="board-styles"></span>

${mdTable(["Style"], boardStyles.map((s) => [`\`${s}\``]))}

## Renderer options <span id="options"></span>

${mdTable(["Option"], options.map((o) => [`\`${o}\``]))}

`;

  fs.writeFileSync(path.join(outDir, "index.md"), md);
  console.log("Generated renderer schema-reference");
}

function generateGameslibFlags() {
  const gameinfoPath = path.join(resolveRepo("gameslib"), "src", "schemas", "gameinfo.json");
  if (!fs.existsSync(gameinfoPath)) {
    console.warn("gameinfo.json not found");
    return;
  }
  const schema = JSON.parse(fs.readFileSync(gameinfoPath, "utf8"));
  const flagsEnum =
    schema.properties?.flags?.items?.enum ||
    schema.definitions?.flags?.items?.enum ||
    [];

  const flagsPath = path.join(resolveRepo("gameslib"), "docs", "flags.md");
  let existing = "";
  if (fs.existsSync(flagsPath)) {
    existing = fs.readFileSync(flagsPath, "utf8");
    if (existing.includes("<!-- generated-flags -->")) {
      existing = existing.split("<!-- generated-flags -->")[0].trimEnd();
    }
  } else {
    existing = `# Game flags

Flags in \`gameinfo\` signal features that require special handling by the front and back ends.

`;
  }

  const table = mdTable(
    ["Flag"],
    flagsEnum.map((f) => [`\`${f}\``])
  );

  const md =
    existing +
    `\n\n<!-- generated-flags -->\n\n## Flag enum (from gameinfo.json)\n\n${table}\n`;
  fs.writeFileSync(flagsPath, md);
  console.log("Updated gameslib flags.md with generated enum");
}

generateRendererSchemaRef();
generateGameslibFlags();
