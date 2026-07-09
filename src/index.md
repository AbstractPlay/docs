---
layout: layouts/base.njk
title: Abstract Play Developer Docs
---

# Abstract Play Developer Docs

Abstract Play is an open-source platform for playing abstract strategy games online. The stack is TypeScript on the backend, React on the frontend, and AWS for hosting.

## Documentation

<div class="doc-cards">
  <a class="doc-card" href="/renderer/">
    <h2>Renderer</h2>
    <p>JSON schema for board representations, rendering engines, and interactive examples.</p>
  </a>
  <a class="doc-card" href="/gameslib/">
    <h2>Games Library</h2>
    <p>Game API, authoring guide, helpers, and how to add new games.</p>
  </a>
  <a class="doc-card" href="/backend/">
    <h2>Backend</h2>
    <p>Serverless API, DynamoDB schema, bot framework, and subsystem guides.</p>
  </a>
  <a class="doc-card" href="/recranks/">
    <h2>Recranks</h2>
    <p>Game record format, rating engines (ELO, Glicko-2, TrueSkill), and schema reference.</p>
  </a>
  <a class="doc-card" href="/crons/">
    <h2>Crons</h2>
    <p>Scheduled Lambdas: DB exports, static records, analytics, tournaments, and standing challenges.</p>
  </a>
</div>

## Coming soon

- **front** — React client

## Resources

- [GitHub organization](https://github.com/AbstractPlay)
- [Coding wiki](https://abstractplay.com/wiki/doku.php?id=coding_docs) (legacy; prefer this site)
- [Discord #dev-curious](https://discord.abstractplay.com)
- [Renderer playground](https://renderer.dev.abstractplay.com) (full interactive demo)
- [Gameslib playground](https://gameslib.dev.abstractplay.com) (local game testing)
