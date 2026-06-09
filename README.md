# tables-editor

An Electron + React desktop viewer for [paper2table](../) result sets. Load a directory of `.tables.json` files and browse all extracted tables with the same layout as `table2html`, without generating an intermediate HTML file.

## Requirements

- Node.js 22+

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

This opens the app in development mode with hot reload.

> **Troubleshooting — `Error: Electron uninstall`**: the Electron binary is downloaded as a separate postinstall step and can be missing if the download failed silently. Fix it with:
> ```bash
> npm run electron:download
> ```

Once open, click **Open directory…** and select a folder that contains one or more `.tables.json` files produced by `paper2table` or `tablemerge`. A `tables.metadata.json` file in the same directory is optional but enables the metadata panel and per-row source tracking.

## Type-check

```bash
npm run typecheck
```

## Build

```bash
npm run build
```

The compiled output is written to `out/`. Run the built app with:

```bash
npm run preview
```

## Schema validation

Each `.tables.json` file is validated against `resources/tablesfile.schema.json` when the directory is loaded. Files that fail validation are still displayed, but a collapsible warning lists the schema errors above the paper's content.

`resources/tablesfile.schema.json` is a copy of `../tablesfile.schema.json` from the parent project. Keep them in sync when the data model changes (see the JSON Schema section in `../CLAUDE.md`).
