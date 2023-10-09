# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![codecov](https://codecov.io/gh/lc-ui/lcui-cli/branch/master/graph/badge.svg?token=USK2SXHC86)](https://codecov.io/gh/lc-ui/lcui-cli)

## 简介

([English](README.md)/**中文**)

LCUI CLI 是一个能帮助你快速开发 LCUI 应用程序的工具，提供：

- 项目脚手架。
- 类似于 Webpack 的编译器，能靠加载器加载特定类型的文件并将其编译为 C 代码。现有以下加载器：
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

``` bash
npm install -g @lcui/cli
# 或者
yarn global add @lcui/cli
```

## 使用

创建一个 LCUI 应用程序项目：

```bash
lcui create my-project
```

编译 src 目录内的所有文件：

```bash
lcui compile src
```

编译单个文件：

```bash
lcui compile src/pages/home/index.tsx
```

## 许可

[MIT](LICENSE)
