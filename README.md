# lcui-toolkit

Monorepo for LCUI web tooling. The previously separate repositories
[`lcui-cli`](https://github.com/lcui-dev/lcui-cli),
[`lcui-react`](https://github.com/lcui-dev/react), and
[`fluent-ui-system-icons`](https://github.com/lcui-dev/fluent-ui-system-icons)
have been merged here. Their full git histories are preserved via
`git subtree`.

## Packages

| Path                                               | npm name                                                                 | Description                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| [`packages/cli`](./packages/cli)                   | [`@lcui/cli`](https://www.npmjs.com/package/@lcui/cli)                   | Command line interface for rapid LCUI development |
| [`packages/react`](./packages/react)               | [`@lcui/react`](https://www.npmjs.com/package/@lcui/react)               | React bindings and JSX-to-C compiler for LCUI     |
| [`packages/fluent-icons`](./packages/fluent-icons) | [`@lcui/fluent-icons`](https://www.npmjs.com/package/@lcui/fluent-icons) | Icon library based on fluentui-system-icons       |

> `@lcui/fluent-icons` was previously published as `@lcui/react-icons`. The
> rename ships in version `2.0.0`; older releases remain available under the
> previous name but receive no further updates.

## Requirements

- Node.js `>= 20`
- npm `>= 10`

## Getting started

```bash
npm install
npm run build
npm test
```

## Development workflow

```bash
# lint / format the entire workspace
npm run lint
npm run format

# run a script in a single workspace
npm run --workspace @lcui/react build
```

## Releases

This monorepo uses [Changesets](https://github.com/changesets/changesets) to
manage independent versions and changelogs for each package.

```bash
# record an intent to publish (creates a markdown file under .changeset/)
npm run changeset

# bump versions and update CHANGELOG.md (typically run by CI)
npm run version-packages

# publish to npm (typically run by CI)
npm run release
```

## License

[MIT](./LICENSE)
