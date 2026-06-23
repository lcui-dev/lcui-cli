import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe('ts-loader — string event handler (onClick="name")', () => {
  const fixtureDir = path.join(fixturesDir, "ts-loader-string-handler");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("emits a forward declaration and ui_widget_on() binding for string handlers", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

    const reactHeader = fs.readFileSync(
      path.join(fixtureDir, "src", "action-button.tsx.h"),
      "utf-8"
    );

    // 1) 字符串形态的事件处理器应当只产出前向声明，而不是内联函数体。
    assert.match(
      reactHeader,
      /static void handle_action_button_click\(ui_widget_t \*w, ui_event_t \*e, void \*arg\);/,
      "expected forward declaration for the C handler function"
    );

    // 2) react_init_events 中应当用这个名字注册事件，事件名是 onClick → "click"。
    assert.match(
      reactHeader,
      /ui_widget_on\([^,]+,\s*"click",\s*handle_action_button_click,\s*w\)/,
      'expected ui_widget_on to bind the named handler to the "click" event'
    );
  });
});
