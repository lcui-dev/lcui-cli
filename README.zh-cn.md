# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![Build Status](https://travis-ci.org/lc-ui/lcui-cli.svg?branch=master)](https://travis-ci.org/lc-ui/lcui-cli)

## 简介

([English](README.md)/**中文**)

LCUI CLI 是一个能让你基于 LCUI 进行快速开发的命令行工具，提供：

- 最小 LCUI 应用模板
- 组件和视图生成器
- 国际化方案

LCUI CLI 致力于将 LCUI 生态中的工具基础标准化。

## 快速开始

在这个工具之前，你需要在你的计算机上安装这些依赖:

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en/download/) (自带 [npm](http://npmjs.com))
- [LCPkg](https://github.com/lc-soft/lcpkg):
    ```bash
    npm install -g lcpkg
    lcpkg setup
    ```
- [CMake](https://cmake.org/) 或 [XMake](https://xmake.io/)

安装：

``` bash
npm install -g @lcui/cli
# 或者
yarn global add @lcui/cli
```

创建一个项目：

``` bash
lcui create my-project
```

进入项目目录并运行它：

``` bash
cd my-project
npm run start
```

如果你已经准备好开发 LCUI 应用程序，可以试试以下命令：

``` bash
# 创建一个组件
lcui generate widget MyWidget

# 创建一个视图
lcui generate view MyView

# 创建用于国际化的配置文件
lcui generate i18n i18n

# 将翻译文件编译为 C 代码 （默认编译 config/i18n.js 为 src/lib/i18n.c 和 src/lib/i18n.h）
lcui ci18n
```

## 许可

[MIT](LICENSE)
