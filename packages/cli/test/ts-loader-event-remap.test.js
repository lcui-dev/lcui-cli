import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("ts-loader — React event name → LCUI event name remap", () => {
  const fixtureDir = path.join(fixturesDir, "ts-loader-event-remap");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("maps onDoubleClick to 'dblclick' and onChange to 'change'", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

    const reactHeader = fs.readFileSync(path.join(fixtureDir, "src", "form.tsx.h"), "utf-8");

    // 1) onDoubleClick 必须被翻译成 LCUI 事件名 dblclick（不是默认的 doubleclick）
    assert.match(
      reactHeader,
      /static void handle_button_dbl\(ui_widget_t \*w, ui_event_t \*e, void \*arg\);/,
      "expected forward declaration for handle_button_dbl"
    );
    assert.match(
      reactHeader,
      /ui_widget_on\([^,]+,\s*"dblclick",\s*handle_button_dbl,\s*w\)/,
      'onDoubleClick should bind to LCUI "dblclick" event name'
    );
    assert.doesNotMatch(
      reactHeader,
      /ui_widget_on\([^,]+,\s*"doubleclick"/,
      'onDoubleClick should NOT bind to the literal "doubleclick" name'
    );

    // 2) onChange 走默认转换，应当直接产出 "change" —— 与 LCUI textinput widget
    //    内部对外派发的事件名一致。
    assert.match(
      reactHeader,
      /static void handle_text_change\(ui_widget_t \*w, ui_event_t \*e, void \*arg\);/,
      "expected forward declaration for handle_text_change"
    );
    assert.match(
      reactHeader,
      /ui_widget_on\([^,]+,\s*"change",\s*handle_text_change,\s*w\)/,
      'TextInput onChange should bind to LCUI "change" event name'
    );
    assert.doesNotMatch(
      reactHeader,
      /ui_widget_on\([^,]+,\s*"textinput"/,
      'onChange should NOT bind to "textinput" — that is the raw widget-internal event'
    );
  });
});
