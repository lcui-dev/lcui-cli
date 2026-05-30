import assert from "assert";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import compile from "../lib/compiler/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const fixturesDir = path.join(__dirname, "fixtures");

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

/**
 * ts-loader 在编译 .tsx 时会 `import("file://<fixture>/node_modules/@lcui/react/lib/index.js")`，
 * 所以每个 fixture 必须能在自身 node_modules 里找到 @lcui/react。
 * 此处用 fs-extra.copySync 把仓库根的 @lcui/react 拷贝进 fixture，
 * 让测试不依赖任何额外的 setup 步骤、可重复运行。
 */
function ensureLcuiReact(fixtureDir) {
  const src = path.join(repoRoot, "node_modules", "@lcui", "react");
  const dst = path.join(fixtureDir, "node_modules", "@lcui", "react");
  if (!fs.existsSync(src)) {
    throw new Error(
      `@lcui/react not found at ${src}. Did you run \`npm install\`? It is a devDependency.`
    );
  }
  fs.removeSync(dst);
  fs.copySync(src, dst, { dereference: true });
}

/** 清掉一次 compile() 留下的所有产物（包括我们 .gitignore 屏蔽的）。 */
function cleanGenerated(fixtureDir, sourceSubdir) {
  fs.removeSync(path.join(fixtureDir, ".lcui"));
  fs.removeSync(path.join(fixtureDir, "dist"));
  fs.removeSync(path.join(fixtureDir, "vendor.node_modules"));
  const sourceDir = path.join(fixtureDir, sourceSubdir);
  if (fs.existsSync(sourceDir)) {
    fs.readdirSync(sourceDir).forEach((name) => {
      if (/\.(c|h)$/.test(name)) {
        fs.removeSync(path.join(sourceDir, name));
      }
    });
  }
}

describe("compile (build) — non-AppRouter project (no app/ directory)", () => {
  const fixtureDir = path.join(fixturesDir, "build-no-router");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("emits component C code derived from the source file's basename", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, {}));

    // ts-loader 在源文件相邻目录写出 *.c / *.h
    const greetingC = fs.readFileSync(path.join(fixtureDir, "src", "Greeting.c"), "utf-8");
    const greetingH = fs.readFileSync(path.join(fixtureDir, "src", "Greeting.h"), "utf-8");

    // 非 AppRouter 项目：组件名来自函数名（snakeCase("Greeting") = "greeting"），
    // 而不是 parsePageRoute 推导出来的 root_* 形式
    assert.match(greetingC, /void ui_register_greeting\(void\)/);
    assert.match(greetingC, /ui_widget_t \*ui_create_greeting\(void\)/);
    assert.match(greetingH, /void ui_register_greeting\(void\);/);
    assert.doesNotMatch(greetingC, /root_/);

    // AppPlugin 把 main.c / main.h 写到 sourceDir
    const mainH = fs.readFileSync(path.join(fixtureDir, "src", "main.h"), "utf-8");
    assert.match(mainH, /ui_register_greeting\(\);/);

    // 非 AppRouter：main.h 不含任何 router 相关代码
    assert.doesNotMatch(mainH, /router\.h/);
    assert.doesNotMatch(mainH, /app_router_init/);
    assert.doesNotMatch(mainH, /AppRouter/);
  });
});

describe("compile (build) — AppRouter project (with app/ directory)", () => {
  const fixtureDir = path.join(fixturesDir, "build-app-router");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "app");
  });

  it("derives component identifiers via parsePageRoute and wires up the router", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, {}));

    // ts-loader 在 app/ 目录下的源文件，组件名走 parsePageRoute：
    // app/layout.tsx → "root_layout"，app/page.tsx → "root_page"
    const pageC = fs.readFileSync(path.join(fixtureDir, "app", "page.c"), "utf-8");
    const layoutC = fs.readFileSync(path.join(fixtureDir, "app", "layout.c"), "utf-8");
    assert.match(pageC, /void ui_register_root_page\(void\)/);
    assert.match(pageC, /ui_widget_t \*ui_create_root_page\(void\)/);
    assert.match(layoutC, /void ui_register_root_layout\(void\)/);
    assert.match(layoutC, /ui_widget_t \*ui_create_root_layout\(void\)/);

    // AppPlugin 在 AppRouter 激活时把 main.c / main.h 写到 appDir（而不是 sourceDir）
    const mainH = fs.readFileSync(path.join(fixtureDir, "app", "main.h"), "utf-8");

    // AppRouter：main.h 必须包含 router 头文件、初始化函数与路由记录
    assert.match(mainH, /#include <router\.h>/);
    assert.match(mainH, /static void app_router_init\(void\)/);
    assert.match(mainH, /router_create\("AppRouter"\)/);
    assert.match(mainH, /router_config_set_component\(config, NULL, "root_page"\)/);
    assert.match(mainH, /ui_register_root_layout\(\);/);
    assert.match(mainH, /ui_register_root_page\(\);/);
  });
});
