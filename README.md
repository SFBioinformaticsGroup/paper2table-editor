# tables-editor

An Electron + React desktop viewer for [paper2table](../) result sets. Load a directory of `.tables.json` files and browse all extracted tables with the same layout as `table2html`, without generating an intermediate HTML file.

## Requirements

- Node.js 22+

## Install

```bash
pnpm install
```

## Run

```bash
pnpm run dev
```

This opens the app in development mode with hot reload.

> **Troubleshooting — `Error: Electron uninstall`**: the Electron binary is downloaded by this project's own `postinstall` script, which runs automatically after `pnpm install`. If the download failed silently, re-run it with:
> ```bash
> pnpm run electron:download
> ```

Once open, click **Open ResultSet** and select a folder that contains one or more `.tables.json` files produced by `paper2table` or `tablemerge`. A `tables.metadata.json` file in the same directory is optional but enables the metadata panel and per-row source tracking.

## Type-check

```bash
pnpm run typecheck
```

## Build

```bash
pnpm run build
```

The compiled output is written to `out/`. Run the built app with:

```bash
pnpm run preview
```

## Releasing

Releases are built automatically by GitHub Actions and published to [GitHub Releases](../../releases) as downloadable installers.

### Prerequisites (first time only)

Install `electron-builder`:

```bash
pnpm install
```

### Steps

1. Bump the version in `package.json`.
2. Commit and push that change.
3. Tag the commit and push the tag:

```bash
git tag v<version>
git push origin v<version>
```

The workflow builds Linux (`.deb`, `.AppImage`) and Windows (`.exe`) installers in parallel and attaches them to a new GitHub Release automatically. The release notes are generated from commits since the previous tag.

### Smoke-test locally before tagging

To build an unpackaged app directory (no installer, fast) on your machine:

```bash
pnpm run dist:dir
```

The unpacked app lands in `dist/linux-unpacked/` or `dist/win-unpacked/`. Run the executable inside to verify the packaged build works before cutting the tag.


## Schema validation

Each `.tables.json` file is validated against `resources/tablesfile.schema.json` when the directory is loaded. Files that fail validation are still displayed, but a collapsible warning lists the schema errors above the paper's content.

`resources/tablesfile.schema.json` is a copy of `../tablesfile.schema.json` from the parent project. Keep them in sync when the data model changes (see the JSON Schema section in `../CLAUDE.md`).
