import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("incremental build — version drift (off-by-one regression)", () => {
  const fixtureDir = path.join(fixturesDir, "incremental-version-drift");

  // Three versions of the same source file. v0 is baseline: a <div> (which maps
  // to "widget") containing a Text child, an Icon-style child (no $ref, no
  // shouldPreRender — matches how @lcui/react-icons emits components), and
  // optionally a bare string between them.
  //
  // We avoid wrapping in local Function widgets with shouldPreRender because
  // that triggers a different (separate) code path where bare strings can be
  // silently dropped. The goal of this test is to exercise the incremental
  // cache, not the React compiler's bare-string handling.
  const V0 = `import { Text, Widget } from "@lcui/react";

function Icon() {
  return <text className="fui-icon">{"\\uF000"}</text>;
}

export default function Widget0() {
  return (
    <Widget className="code-block" onClick="handle_on_click">
      <Text>Copy</Text>
      <Icon />
    </Widget>
  );
}
`;
  const V1 = `import { Text, Widget } from "@lcui/react";

function Icon() {
  return <text className="fui-icon">{"\\uF000"}</text>;
}

export default function Widget0() {
  return (
    <Widget className="code-block" onClick="handle_on_click">
      <Text>Copy</Text>marker_v1
      <Icon />
    </Widget>
  );
}
`;
  const V2 = V0;

  // UTF-8 bytes of "marker_v1", we assert against the raw byte array emitted
  // as `widget_text_N[]` in the generated .tsx.h file.
  const MARKER_BYTES = /0x6d, 0x61, 0x72, 0x6b, 0x65, 0x72, 0x5f, 0x76, 0x31/;

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("does not produce stale .tsx.h across source reversion (v0 → v1 → v2=v0)", async function () {
    this.timeout(60000);

    const srcFile = path.join(fixtureDir, "src", "widget.tsx");
    const tsxH = path.join(fixtureDir, "src", "widget.tsx.h");

    const compileClean = async () => {
      await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));
    };

    // ---- v0 ----
    fs.writeFileSync(srcFile, V0);
    await compileClean();
    const H0 = fs.readFileSync(tsxH, "utf-8");
    assert.doesNotMatch(H0, /marker_v1/, "v0 .tsx.h must NOT contain the string 'marker_v1'");
    assert.doesNotMatch(
      H0,
      MARKER_BYTES,
      "v0 .tsx.h must NOT contain the UTF-8 bytes of 'marker_v1'"
    );

    // Give the filesystem a moment so mtime precision is enough to see the next write.
    await new Promise((r) => setTimeout(r, 1100));

    // ---- v1 ----
    fs.writeFileSync(srcFile, V1);
    await compileClean();
    const H1 = fs.readFileSync(tsxH, "utf-8");
    assert.match(
      H1,
      MARKER_BYTES,
      "v1 .tsx.h MUST contain the UTF-8 bytes of 'marker_v1'; " +
        "a failure here means the React compiler is still dropping bare string siblings"
    );

    await new Promise((r) => setTimeout(r, 1100));

    // ---- v2 (= v0) ----
    fs.writeFileSync(srcFile, V2);
    await compileClean();
    const H2 = fs.readFileSync(tsxH, "utf-8");
    assert.doesNotMatch(
      H2,
      /marker_v1/,
      "v2 .tsx.h must NOT contain the string 'marker_v1' — this is the off-by-one regression"
    );
    assert.doesNotMatch(
      H2,
      MARKER_BYTES,
      "v2 .tsx.h must NOT contain the UTF-8 bytes of 'marker_v1' — " +
        "a failure here means the incremental cache is re-emitting stale outputs"
    );

    // ---- sanity: consecutive no-op build must not touch any output ----
    const H2_mtime = fs.statSync(tsxH).mtimeMs;
    await new Promise((r) => setTimeout(r, 1100));
    await compileClean();
    const H2b = fs.readFileSync(tsxH, "utf-8");
    const H2b_mtime = fs.statSync(tsxH).mtimeMs;
    assert.equal(H2b, H2, "consecutive no-op build must produce identical .tsx.h contents");
    assert.equal(
      H2b_mtime,
      H2_mtime,
      "consecutive no-op build must not rewrite the .tsx.h file (mtime must not change)"
    );
  });
});
