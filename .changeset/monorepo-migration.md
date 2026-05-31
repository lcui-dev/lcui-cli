---
"@lcui/cli": patch
"@lcui/react": patch
"@lcui/fluent-icons": patch
---

Repository restructure: the three packages now live in a single monorepo at
[`lcui-dev/lcui-toolkit`](https://github.com/lcui-dev/lcui-toolkit), managed with
npm workspaces and Changesets. The original repositories have been archived.
No runtime behaviour changes; published artifacts are equivalent to the prior
standalone releases.
