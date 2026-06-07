---
"@lcui/cli": minor
---

feat(cli): incremental compilation with persistent build manifest

`lcui build` is now incremental. A build manifest at
`.lcui/build/manifest.json` records each source file's content hash, loader
chain, dependency hashes (collected from `import`, sass `@use`/`@import`,
postcss / tailwind config, etc.) and output hashes. Unchanged entries are
skipped entirely on subsequent builds and their previous outputs are reused.

Every write also goes through a content-aware `writeIfChanged`: if the new
bytes match the file on disk, the file is not touched. This prevents
spurious `mtime` updates from triggering a full `xmake` rebuild when nothing
actually changed.

New CLI flags:

- `--force` — ignore the manifest and rebuild everything.
- `--skip-xmake` — do not invoke `xmake` after compilation.

The manifest is invalidated automatically when the CLI version, the
compiler configuration, or `tsconfig.json` / `postcss.config.*` /
`tailwind.config.*` / `lcui.config.js` change. `xmake` is also auto-skipped
when no output file changed during the build.
