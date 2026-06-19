---
"@lcui/cli": minor
---

feat(cli): prefix-aware naming for internal components

Improve internal component naming to avoid redundancy and preserve
user-defined customization:

- Skip prefix injection when the function name already starts with the file
  prefix in snake_case (e.g., `FieldTableProvider` in `field-table.tsx`
  becomes `field_table_provider`, not `field_table_field_table_provider`)

- Detect user-set `displayName` assignments in AST and preserve them verbatim,
  without auto-prefix injection or `snakeCase` normalization

- Use double underscore (`__`) separator when injecting file prefix for
  internal components (e.g., `Header` in `page.tsx` becomes `page__header`),
  making injected names visually distinct from natural component names

- Update `@lcui/react` to use `displayName` as-is (not via `snakeCase`) when
  generating widget tags, ensuring the `__` separator survives through to the
  final C identifier
