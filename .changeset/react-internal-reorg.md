---
"@lcui/react": minor
---

Internal: split `src/` into `runtime/`, `compiler/`, and `widgets/` subdirectories.

Add subpath exports so callers can import a narrower surface area:

```ts
import { Button } from "@lcui/react/widgets";
import { compile } from "@lcui/react/compiler";
import { useState } from "@lcui/react/runtime";
```

No breaking changes — every symbol previously exported from `@lcui/react` is
still available from the package root.
