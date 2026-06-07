# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![codecov](https://codecov.io/gh/lc-ui/lcui-cli/branch/master/graph/badge.svg?token=USK2SXHC86)](https://codecov.io/gh/lc-ui/lcui-cli)

## Introduction

(**English**/[中文](README.zh-cn.md))

LCUI CLI is command line interface for rapid LCUI development. providing:

- Project scaffolding.
- A compiler similar to Webpack that can load specific types of files and compile them into C code using a loader. The following loaders exist:
  - ts-loader: Load JavaScript and TypeScript files, supporting JSX syntax. You can write LCUI widgets like you would write React components.
  - css-loader: Load CSS files, supporting the CSS Modules.
  - sass-loader: Load the Sass/SCSS file and compile it into CSS.
  - json-loader: Load JSON files, allowing you to describe the interface in JSON format.
  - xml-loader: Load an XML file, allowing you to describe the interface in XML format.
  - yaml-loader: Load YAML files, allowing you to describe the interface in YAML format.

## Installation

Before installing this tool, you need to install these dependencies on your computer:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en/download/) (which comes with [npm](http://npmjs.com))
- [XMake](https://xmake.io/)

Afterwards, run:

```bash
npm install -g @lcui/cli
# Or
yarn global add @lcui/cli
```

## Usage

Create an LCUI application project:

```bash
lcui create my-project
```

Compile all files in the src directory:

```bash
lcui build
```

Compile a single file:

```bash
lcui build app/page.tsx
```

### Incremental build

`lcui build` is incremental by default. A build manifest is persisted at
`.lcui/build/manifest.json` and tracks, for every source file:

- A `sha256` of the source file content
- The loader chain and options that produced it
- The list of dependencies that the loaders read (imports, `@use` / `@import`
  partials, `postcss.config.js`, `tailwind.config.js`, …)
- The list of output files (`.mjs` modules, `.c` / `.h` for components,
  resources copied into `dist/`) together with their `sha256`

On the next build a file is rebuilt only when its source hash, its dependency
hashes or its output hashes do not match the manifest. Everything else is
skipped — its outputs are reused as-is.

In addition every write goes through `writeIfChanged`: if the new bytes are
identical to the existing file we do not touch it, so downstream tools that
rely on `mtime` (most notably `xmake`) will not see spurious changes and will
not trigger a full C rebuild.

Available options:

- `--force` — ignore the manifest and rebuild everything. Useful if you
  suspect the cache is stale, or after editing files that the dependency
  tracker cannot see.
- `--skip-xmake` — do not invoke `xmake` after compilation, even if
  `xmake.lua` exists.

The manifest is automatically invalidated when:

- `@lcui/cli` is upgraded
- The compiler configuration changes
- `tsconfig.json`, `postcss.config.*`, `tailwind.config.*` or `lcui.config.js`
  change

## License

[MIT](../../LICENSE)
