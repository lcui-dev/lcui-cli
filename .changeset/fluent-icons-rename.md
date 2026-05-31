---
"@lcui/fluent-icons": major
---

BREAKING: package renamed from `@lcui/react-icons` to `@lcui/fluent-icons`.

The functionality is unchanged, but the package name on npm has moved. Update
your dependency and import statements:

```diff
- import { Icon } from "@lcui/react-icons";
+ import { Icon } from "@lcui/fluent-icons";
```

The previous package (`@lcui/react-icons`) will receive no further updates.
