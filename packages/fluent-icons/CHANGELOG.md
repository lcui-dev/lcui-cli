## [1.0.4](https://gitee.com/lcui-dev/fluent-ui-system-icons/compare/v1.0.3...v1.0.4) (2025-01-27)

## 2.0.0

### Major Changes

- b39bde0: BREAKING: package renamed from `@lcui/react-icons` to `@lcui/fluent-icons`.

  The functionality is unchanged, but the package name on npm has moved. Update
  your dependency and import statements:

  ```diff
  - import { Icon } from "@lcui/react-icons";
  + import { Icon } from "@lcui/fluent-icons";
  ```

  The previous package (`@lcui/react-icons`) will receive no further updates.

### Patch Changes

- b39bde0: Repository restructure: the three packages now live in a single monorepo at
  [`lcui-dev/lcui-toolkit`](https://github.com/lcui-dev/lcui-toolkit), managed with
  npm workspaces and Changesets. The original repositories have been archived.
  No runtime behaviour changes; published artifacts are equivalent to the prior
  standalone releases.
- Updated dependencies [082269c]
- Updated dependencies [62e81f8]
- Updated dependencies [b39bde0]
- Updated dependencies [9638d0a]
- Updated dependencies [b39bde0]
- Updated dependencies [d97979c]
  - @lcui/react@0.6.0

## [1.0.3](https://gitee.com/lcui-dev/fluent-ui-system-icons/compare/v1.0.2...v1.0.3) (2024-12-23)

### Bug Fixes

- 仅在 fontSize 参数有效时设置样式 ([b12e133](https://gitee.com/lcui-dev/fluent-ui-system-icons/commits/b12e133b761ef42560ebf3dfead760711fadc93b))
