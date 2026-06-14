---
"@lcui/react": patch
---

fix(react): bind every widget when multiple widgets share the same string event handler

Previously the compiler deduplicated event handler declarations by name,
which caused `ui_widget_on` to be emitted only for the first widget when
several buttons shared the same `onClick="my_handler"`. Split the handler
declaration (still deduplicated) from the per-widget binding (no longer
deduplicated) so each widget correctly receives its own `ui_widget_on` call.
