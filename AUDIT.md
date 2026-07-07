# Documentation audit notes

Initial migration audit (develop branch). Authoritative sources win over prose.

## Renderer

| Item | Status |
|------|--------|
| `schema.adoc` → Markdown | Migrated to `docs/*.md`; `schema.adoc` removed |
| Engine enum (16 values) | Documented in auto-generated `schema-reference/` |
| Board styles | Auto-generated from `schema.json` `$defs.boardStyles` |
| Playground samples | 89 samples extracted to `docs/samples/` |
| `schema.json` vs narrative | Narrative links to generated reference |

### Engines added vs old schema.adoc

`homeworlds-orig`, `freespace`, `sowing-numerals`, `sowing-pips`, `isometric`, `tree-pyramid`, `stacking-3D` were missing from schema.adoc; now in generated reference.

## Gameslib

| Item | Status |
|------|--------|
| `api.md` | Refactored; authoring moved to dedicated pages |
| `new-game-template.ts` | Moved to `docs/templates/` |
| `GameBase` manifest | `game-object.md` yaml manifest for docs-check |
| `gameinfo` flags | Generated enum in `flags.md` |
| `src/common/` helpers | New `helpers/*.md` pages with exemplar games |
| Example index | `helpers/_examples.json` + `examples/by-feature.md` auto-generated |

## CI

- `npm run docs:check` in docs build
- `repository_dispatch` relays from renderer and gameslib workflows
