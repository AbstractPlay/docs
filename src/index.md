---
layout: layouts/base.njk
title: Abstract Play Developer Docs
---

# Abstract Play Developer Docs

Abstract Play is an open-source platform for playing abstract strategy games online.

The **backend** is TypeScript on AWS: Cognito for accounts, DynamoDB for data, Lambda and API Gateway for the API, and supporting services for bots, crons, and static assets. The **front end** is a React SPA served through CloudFront. Game logic lives in **gameslib**; board rendering in **renderer**; batch ratings and record schema in **recranks**.

We welcome contributors. Ask questions in [Discord #dev-curious](https://discord.abstractplay.com).

## Documentation

<div class="doc-cards">
  <a class="doc-card" href="/gameslib/">
    <h2>Games Library</h2>
    <p>Game API, authoring guide, helpers, meta-game catalog, categories, and how to add new games.</p>
  </a>
  <a class="doc-card" href="/renderer/">
    <h2>Renderer</h2>
    <p>JSON schema for board representations, rendering engines, and interactive examples.</p>
  </a>
  <a class="doc-card" href="/backend/">
    <h2>Backend</h2>
    <p>Serverless API, DynamoDB schema, bot framework, and subsystem guides.</p>
  </a>
  <a class="doc-card" href="/crons/">
    <h2>Crons</h2>
    <p>Scheduled Lambdas: DB exports, static records, analytics, tournaments, and standing challenges.</p>
  </a>
  <a class="doc-card" href="/recranks/">
    <h2>Records & Rankings</h2>
    <p>Game record format, rating engines (ELO, Glicko-2, TrueSkill), and schema reference.</p>
  </a>
  <a class="doc-card" href="/front/">
    <h2>Front</h2>
    <p>React client: architecture, local dev, API usage, subsystems, and deployment.</p>
  </a>
</div>

## Repositories

| Repository | Docs | Role |
| --- | --- | --- |
| [front](https://github.com/AbstractPlay/front) | [/front/](/front/) | React play client |
| [gameslib](https://github.com/AbstractPlay/gameslib) | [/gameslib/](/gameslib/) | Game implementations and registry |
| [renderer](https://github.com/AbstractPlay/renderer) | [/renderer/](/renderer/) | SVG board renderer |
| [node-backend](https://github.com/AbstractPlay/node-backend) | [/backend/](/backend/), [/crons/](/crons/) | API, DynamoDB, bots, and scheduled jobs (`crons/` in the same repo) |
| [recranks](https://github.com/AbstractPlay/recranks) | [/recranks/](/recranks/) | Records and rating engines |

The former [backend-crons](https://github.com/AbstractPlay/backend-crons) repository is **archived**; crons code and docs now live under **`node-backend/crons/`**.

Related projects: [Ai Ai bot](https://github.com/AbstractPlay/aiai) (Java), community sites **designer** and **zendo** (Svelte) for experiments outside the main play stack.

Tooling references: [Meta-game catalog](/gameslib/meta-games/) (uids for integrations), [Categories & tags](/gameslib/categories/).

## Resources

- [GitHub organization](https://github.com/AbstractPlay)
- [Community wiki](https://abstractplay.com/wiki) — rules and player guides (`games:*` articles)
- [Discord #dev-curious](https://discord.abstractplay.com)
- [Renderer playground](https://renderer.dev.abstractplay.com) (full interactive demo)
- [Gameslib playground](https://gameslib.dev.abstractplay.com) (local game testing)
