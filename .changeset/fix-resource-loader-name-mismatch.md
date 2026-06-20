---
"@lcui/cli": patch
---

fix(cli): use default export name for resource loader when shouldPreRender filters inner components

When a TSX file has multiple components and inner ones use `shouldPreRender`
(so ui-loader filters them out), ui-loader previously derived the resource
loader function name from the surviving schema (`currentSchema.name`) instead
of the default export. This caused a linker error because ts-loader declared
`ui_load_field_table_resources` but ui-loader emitted
`ui_load_field_table_provider_resources`.

Fix by passing `defaultComponentSnakeName` from ts-loader to ui-loader via a
`default-component` node in the tree, so both loaders agree on the resource
function name regardless of schema filtering.
