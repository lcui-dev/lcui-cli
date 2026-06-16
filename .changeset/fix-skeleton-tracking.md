---
"@lcui/cli": patch
---

fix(cli): track skeleton .c/.h files in manifest to prevent cache from skipping regeneration

Skeleton `.c` and `.h` files were lost from the build manifest after the
first incremental rebuild. When `ts-loader` ran on a subsequent build and a
skeleton already existed on disk, `emitFile` was skipped (by the `existsSync`
guard), so `recordEntryOutput` was never called. `finalizeEntry` then
overwrote the manifest entry with an `outputs` list that omitted the
skeletons. Deleting those files afterwards would never invalidate the cache,
and they were never regenerated.

Added a new `CompilerContext.addOutput(filePath)` method that lets loaders
declare an existing file as an entry output without triggering a write.
`ts-loader` now calls it in the `else` branch of the `existsSync` guard,
ensuring skeletons are always tracked in the manifest regardless of whether
they were created or reused in this build.
