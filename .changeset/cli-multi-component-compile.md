---
"@lcui/cli": minor
---

feat(cli): compile all component functions in TSX files

Previously only `export default` components were compiled. Now `ts-loader`
compiles all three categories: `export default`, named exports (`export function`),
and internal functions (non-exported).

Internal components receive a file-name prefix to avoid global namespace
collisions. For example, `MyButton` in `helpers.tsx` becomes `helpers_my_button`.
Each component independently generates its own `ui_register_{name}`, `ui_create_{name}`,
and related functions, and all registrations are individually called in `main.h`.