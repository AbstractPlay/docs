# Abstract Play Developer Documentation

Static documentation site for Abstract Play, built with [Eleventy](https://www.11ty.dev/) and deployed to AWS S3 via serverless-finch.

- **Dev:** https://docs.dev.abstractplay.com (from `develop`)
- **Prod:** https://docs.abstractplay.com (from `main`)

## Local development

```bash
git clone --recurse-submodules https://github.com/AbstractPlay/docs.git
cd docs
npm install
npm run extract-samples   # once, or when playground samples change
npm run serve             # http://localhost:8080
```

If submodules are not initialized, prebuild falls back to sibling `../renderer`, `../gameslib`, `../node-backend`, and `../recranks` directories.

## Build

```bash
npm run build
```

Runs `docs:check`, syncs vendor docs, generates schema reference pages, copies `APRender.min.js`, and outputs to `dist/`.

## AWS setup

See [infra/README.md](infra/README.md).

## CI

Deploy workflows listen for `repository_dispatch` from renderer, gameslib, and recranks (`dep_update_dev` / `dep_update_prod`). Each run fetches the latest `develop` or `main` tip from vendor submodules before building.

## Contributing

Documentation content lives in each repository's `/docs` folder. Update renderer, gameslib, or recranks docs there; this repo aggregates via submodules.

When changing `schema.json`, `gameinfo.json`, or `GameBase`, update `/docs` in the same PR.
