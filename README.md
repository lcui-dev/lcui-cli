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

``` bash
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

## License

[MIT](LICENSE)
