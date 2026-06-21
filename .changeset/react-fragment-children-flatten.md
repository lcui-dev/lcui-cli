---
"@lcui/react": minor
---

feat(react): support Fragment flattening in children

Fragment elements (<>...</>) in children are now auto-flattened at compile
time, so each fragment's children become siblings of the parent node. This
enables list rendering patterns like .map() returning multiple sibling
elements without a wrapper widget.
