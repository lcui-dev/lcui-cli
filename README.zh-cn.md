# lcui-cli

[![GitHub Actions](https://github.com/lc-ui/lcui-cli/workflows/Node.js%20CI/badge.svg)](https://github.com/lc-ui/lcui-cli/actions)
[![codecov](https://codecov.io/gh/lc-ui/lcui-cli/branch/master/graph/badge.svg?token=USK2SXHC86)](https://codecov.io/gh/lc-ui/lcui-cli)

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
- [XMake](https://xmake.io/)

安装：

``` bash
npm install -g @lcui/cli
# 或者
yarn global add @lcui/cli
```

然后运行以下命令：

``` bash
# 创建一个项目
lcui create my-project

# 进入项目目录
cd my-project

# 构建项目
xmake

# 运行项目
xmake run
```

如果你已经准备好开发 LCUI 应用程序，可以试试以下命令：

``` bash
# 创建一个组件
lcui generate widget MyWidget

# 创建一个视图
lcui generate view MyView
```

## 许可

[MIT](LICENSE)
