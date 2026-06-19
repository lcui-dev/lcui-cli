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

describe("ts-loader — multi-component compilation", () => {
  const fixtureDir = path.join(fixturesDir, "ts-loader-multi-component");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("compiles all exported and internal components with correct naming", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

    const tsxH = fs.readFileSync(path.join(fixtureDir, "src", "helpers.tsx.h"), "utf-8");
    const helpersH = fs.readFileSync(path.join(fixtureDir, "src", "helpers.h"), "utf-8");
    const mainH = fs.readFileSync(path.join(fixtureDir, "src", "main.h"), "utf-8");

    // 1) Default export component: uses function name "App" → "app"
    assert.match(tsxH, /app_proto/, "default component should use snake_case function name: app");
    assert.match(tsxH, /ui_create_widget_prototype\("app"/, "App should register widget prototype 'app'");
    assert.match(helpersH, /void ui_register_app\(void\);/, "helpers.h should declare ui_register_app");
    assert.match(mainH, /ui_register_app\(\);/, "main.h should call ui_register_app()");

    // 2) Named export component: uses function name "Card" → "card"
    assert.match(tsxH, /card_proto/, "named export should use snake_case function name: card");
    assert.match(tsxH, /ui_create_widget_prototype\("card"/, "Card should register widget prototype 'card'");
    assert.match(helpersH, /void ui_register_card\(void\);/, "helpers.h should declare ui_register_card");
    assert.match(mainH, /ui_register_card\(\);/, "main.h should call ui_register_card()");

    // 3) Internal (non-exported) component: uses "__" separator (file-name prefix + function name)
    //    MyButton in helpers.tsx → "helpers__my_button"
    assert.match(tsxH, /helpers__my_button_proto/, "internal component should use __ separator: helpers__my_button");
    assert.match(tsxH, /ui_create_widget_prototype\("helpers__my_button"/, "MyButton should register widget prototype 'helpers__my_button'");
    assert.match(helpersH, /void ui_register_helpers__my_button\(void\);/, "helpers.h should declare ui_register_helpers__my_button");
    assert.match(mainH, /ui_register_helpers__my_button\(\);/, "main.h should call ui_register_helpers__my_button()");

    assert.match(tsxH, /typedef struct app_react_state/, "App should have its own state type");
    assert.match(tsxH, /typedef struct card_react_state/, "Card should have its own state type");
    assert.match(tsxH, /typedef struct helpers__my_button_react_state/, "MyButton should have its own state type");

    assert.match(tsxH, /ui_create_widget\("card"\)/, "App template should reference Card widget");
    assert.match(tsxH, /ui_create_widget\("helpers__my_button"\)/, "App template should reference MyButton widget with prefix");

    const helpersC = fs.readFileSync(path.join(fixtureDir, "src", "helpers.c"), "utf-8");
    assert.match(helpersC, /app_init/, ".c file should contain App init function");
    assert.match(helpersC, /card_init/, ".c file should contain Card init function");
    assert.match(helpersC, /helpers__my_button_init/, ".c file should contain MyButton init function");
  });
});