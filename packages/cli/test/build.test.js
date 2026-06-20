import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import {
  fixturesDir,
  withCwd,
  ensureLcuiReact,
  cleanGenerated,
} from "./helpers.js";

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
    const greetingC = fs.readFileSync(path.join(fixtureDir, "src", "greeting.c"), "utf-8");
    const greetingH = fs.readFileSync(path.join(fixtureDir, "src", "greeting.h"), "utf-8");

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

    // 资源加载函数使用路由派生名称：page.tsx → root_page, layout.tsx → root_layout
    const pageH = fs.readFileSync(path.join(fixtureDir, "app", "page.tsx.h"), "utf-8");
    const layoutH = fs.readFileSync(path.join(fixtureDir, "app", "layout.tsx.h"), "utf-8");
    assert.match(pageH, /void ui_load_root_page_resources\(void\)/);
    assert.match(layoutH, /void ui_load_root_layout_resources\(void\)/);
  });
});
