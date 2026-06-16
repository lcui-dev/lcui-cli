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

    // 3) Internal (non-exported) component: uses file-name prefix "helpers" + function name "MyButton" → "helpers_my_button"
    assert.match(tsxH, /helpers_my_button_proto/, "internal component should use file-name prefix: helpers_my_button");
    assert.match(tsxH, /ui_create_widget_prototype\("helpers_my_button"/, "MyButton should register widget prototype 'helpers_my_button'");
    assert.match(helpersH, /void ui_register_helpers_my_button\(void\);/, "helpers.h should declare ui_register_helpers_my_button");
    assert.match(mainH, /ui_register_helpers_my_button\(\);/, "main.h should call ui_register_helpers_my_button()");

    // 4) Each component should have its own type definitions and init/destroy functions
    assert.match(tsxH, /typedef struct app_react_state/, "App should have its own state type");
    assert.match(tsxH, /typedef struct card_react_state/, "Card should have its own state type");
    assert.match(tsxH, /typedef struct helpers_my_button_react_state/, "MyButton should have its own state type");

    // 5) Verify component references in template
    assert.match(tsxH, /ui_create_widget\("card"\)/, "App template should reference Card widget");
    assert.match(tsxH, /ui_create_widget\("helpers_my_button"\)/, "App template should reference MyButton widget with prefix");

    // 6) Source code (.c file) should contain all three components' implementation blocks
    const helpersC = fs.readFileSync(path.join(fixtureDir, "src", "helpers.c"), "utf-8");
    assert.match(helpersC, /app_init/, ".c file should contain App init function");
    assert.match(helpersC, /card_init/, ".c file should contain Card init function");
    assert.match(helpersC, /helpers_my_button_init/, ".c file should contain MyButton init function");
  });
});