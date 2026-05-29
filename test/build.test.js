import assert from "assert";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import compile from "../lib/compiler/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureDir = path.join(__dirname, "fixtures", "build-basic");

/**
 * `compile()` 内部通过 `process.cwd()` 定位项目根目录，所以测试需要
 * 切换 cwd 到 fixture 目录后再调用，并在结束时恢复。
 */
async function withCwd(dir, fn) {
  const original = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(original);
  }
}

describe("compile (build)", () => {
  // 清理上一次运行的产物，确保测试可重复执行。
  before(() => {
    fs.removeSync(path.join(fixtureDir, ".lcui"));
    fs.removeSync(path.join(fixtureDir, "dist"));
    fs.removeSync(path.join(fixtureDir, "vendor.node_modules"));
    fs.removeSync(path.join(fixtureDir, "src", "hello.css.h"));
    fs.removeSync(path.join(fixtureDir, "src", "main.c"));
    fs.removeSync(path.join(fixtureDir, "src", "main.h"));
  });

  it("compiles a CSS source through css-loader and writes expected artifacts", async function () {
    this.timeout(30000);

    await withCwd(fixtureDir, () => compile(undefined, {}));

    // css-loader 调用 generateModule 在 .lcui/build/ 下产出 ES 模块
    const mjsPath = path.join(fixtureDir, ".lcui", "build", "src", "hello.css.mjs");
    assert.strictEqual(fs.existsSync(mjsPath), true, `${mjsPath} should exist`);
    const mjsContent = fs.readFileSync(mjsPath, "utf-8");
    assert.match(mjsContent, /export const metadata/);
    assert.match(mjsContent, /ui_load_css_string/);

    // css-loader 把 CSS 序列化为 C 头文件
    const headerPath = path.join(fixtureDir, "src", "hello.css.h");
    assert.strictEqual(fs.existsSync(headerPath), true, `${headerPath} should exist`);
    const headerContent = fs.readFileSync(headerPath, "utf-8");
    assert.match(headerContent, /css_str_hello/);
    assert.match(headerContent, /\.hello/);

    // AppPlugin 在 done 钩子里生成 main.c / main.h 入口
    const mainC = path.join(fixtureDir, "src", "main.c");
    const mainH = path.join(fixtureDir, "src", "main.h");
    assert.strictEqual(fs.existsSync(mainC), true, `${mainC} should exist`);
    assert.strictEqual(fs.existsSync(mainH), true, `${mainH} should exist`);
    assert.match(fs.readFileSync(mainC, "utf-8"), /int main\(/);
    assert.match(fs.readFileSync(mainH, "utf-8"), /lcui_init\(\)/);
  });

  it("is idempotent: running compile() again does not throw", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, {}));
  });
});
