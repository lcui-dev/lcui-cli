# lcui-toolkit

(**中文**/[English](./README.md))

LCUI Web 周边工具的 monorepo 仓库。原来分散维护的三个仓库
[`lcui-cli`](https://github.com/lcui-dev/lcui-cli)、
[`lcui-react`](https://github.com/lcui-dev/react) 和
[`fluent-ui-system-icons`](https://github.com/lcui-dev/fluent-ui-system-icons)
已合并到本仓库统一管理，三个仓库各自完整的 git 历史通过 `git subtree` 保留。

## 包列表

| 路径                                               | npm 包名                                                                 | 简介                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------- |
| [`packages/cli`](./packages/cli)                   | [`@lcui/cli`](https://www.npmjs.com/package/@lcui/cli)                   | LCUI 应用快速开发命令行工具            |
| [`packages/react`](./packages/react)               | [`@lcui/react`](https://www.npmjs.com/package/@lcui/react)               | LCUI 的 React 绑定及 JSX 到 C 的编译器 |
| [`packages/fluent-icons`](./packages/fluent-icons) | [`@lcui/fluent-icons`](https://www.npmjs.com/package/@lcui/fluent-icons) | 基于 fluentui-system-icons 的图标库    |

> `@lcui/fluent-icons` 此前以 `@lcui/react-icons` 名称发布，从 `2.0.0` 起改用新名。
> 旧包仍可在 npm 上访问，但不再继续更新。

## 环境要求

- Node.js `>= 20`
- npm `>= 10`

## 快速开始

```bash
npm install
npm run build
npm test
```

## 开发工作流

```bash
# 对整个 workspace 执行 lint / 格式化
npm run lint
npm run format

# 仅对单个 workspace 执行脚本
npm run --workspace @lcui/react build
```

## 发版

本仓库使用 [Changesets](https://github.com/changesets/changesets) 管理三个包各自独立的版本号与变更日志。

```bash
# 记录一次待发版意图（在 .changeset/ 下生成一个 markdown 文件）
npm run changeset

# 应用 changeset 升级版本号并更新 CHANGELOG.md（通常由 CI 执行）
npm run version-packages

# 发布到 npm（通常由 CI 执行）
npm run release
```

## 许可

[MIT](./LICENSE)
