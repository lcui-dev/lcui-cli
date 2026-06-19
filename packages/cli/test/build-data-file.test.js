import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("compile (build) — ts data file without component function", () => {
  const fixtureDir = path.join(fixturesDir, "build-data-file");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("completes without error and does not emit C code for data-only .ts files", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, {}));

    // 纯数据文件 widget.ts 不应生成对应的 .c / .h 文件
    assert.strictEqual(
      fs.existsSync(path.join(fixtureDir, "src", "widget.c")),
      false,
      "widget.c should NOT be generated for data-only .ts files"
    );
    assert.strictEqual(
      fs.existsSync(path.join(fixtureDir, "src", "widget.h")),
      false,
      "widget.h should NOT be generated for data-only .ts files"
    );
    assert.strictEqual(
      fs.existsSync(path.join(fixtureDir, "src", "widget.tsx.h")),
      false,
      "widget.tsx.h should NOT be generated for data-only .ts files"
    );

    // 有组件的文件 greeting.tsx 应正常生成
    assert.strictEqual(
      fs.existsSync(path.join(fixtureDir, "src", "greeting.c")),
      true,
      "greeting.c should be generated"
    );
    const greetingC = fs.readFileSync(path.join(fixtureDir, "src", "greeting.c"), "utf-8");
    assert.match(greetingC, /void ui_register_greeting\(void\)/);

    // main.h 只包含 greeting 的注册，不包含 widget 的注册
    const mainH = fs.readFileSync(path.join(fixtureDir, "src", "main.h"), "utf-8");
    assert.match(mainH, /ui_register_greeting\(\);/);
    assert.doesNotMatch(mainH, /ui_register_widget/);
  });
});
