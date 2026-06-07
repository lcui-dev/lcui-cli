# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![codecov](https://codecov.io/gh/lc-ui/lcui-cli/branch/master/graph/badge.svg?token=USK2SXHC86)](https://codecov.io/gh/lc-ui/lcui-cli)

## 简介

([English](README.md)/**中文**)

LCUI CLI 是一个能帮助你快速开发 LCUI 应用程序的工具，提供：

- 项目脚手架。
- 类似于 Webpack 的编译器，基于多种加载器：
  - ts-loader：加载 JavaScript、TypeScript 文件，支持 JSX 语法。你可以像编写 React 组件一样编写 LCUI 部件。
  - css-loader：加载 CSS 文件，支持 CSS Modules 写法。
  - sass-loader： 加载 Sass/SCSS 文件并将其编译为 CSS。
  - json-loader：加载 JSON 文件，允许你以 JSON 格式描述界面。
  - xml-loader：加载 XML 文件，允许你以 XML 格式描述界面。
  - yaml-loader：加载 YAML 文件，允许你以 YAML 格式描述界面。

LCUI CLI 致力于将 LCUI 生态中的工具基础标准化。

## 安装

在安装这个工具之前，你需要在你的计算机上安装这些依赖:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en/download/) (自带 [npm](http://npmjs.com))
- [XMake](https://xmake.io/)

之后，运行：

```bash
npm install -g @lcui/cli
# 或者
yarn global add @lcui/cli
```

## 使用

创建一个 LCUI 应用程序项目：

```bash
lcui create my-project
```

编译 app 目录内的所有文件：

```bash
lcui build
```

编译单个文件：

```bash
lcui build app/page.tsx
```

### 增量编译

`lcui build` 默认是增量的。编译器会在 `.lcui/build/manifest.json` 持久化一份
构建清单，为每一个源文件记录：

- 源文件内容的 `sha256`
- 该文件命中的 loader 链与选项
- 各 loader 实际读取过的依赖文件（如 import、`@use`/`@import`、
  `postcss.config.js`、`tailwind.config.js` 等）
- 该入口产出的所有产物（`.mjs`、组件 `.c`/`.h`、复制到 `dist/` 的资源）以及
  它们的 `sha256`

下一次 build 时，只有源/依赖/产物 hash 不匹配的入口才会真正走 loader 链，
其它入口直接复用已有产物，跳过编译。

此外，所有写盘动作都走 `writeIfChanged`：新内容与磁盘上的旧内容字节一致时
就不会写入，这样依赖 `mtime` 判定的下游工具（典型的是 `xmake`）不会被"假
改动"误触发，从而避免不必要的 C 全量编译。

可用选项：

- `--force` — 忽略 manifest，强制重编所有文件。怀疑缓存失真，或修改了依赖
  追踪覆盖不到的文件时使用。
- `--skip-xmake` — 编译完成后不调用 `xmake`，即便存在 `xmake.lua`。

以下情况会自动让整张 manifest 作废：

- 升级 `@lcui/cli`
- 编译器配置发生改变
- 根目录下的 `tsconfig.json`、`postcss.config.*`、`tailwind.config.*` 或
  `lcui.config.js` 发生变化

## 许可

[MIT](../../LICENSE)
