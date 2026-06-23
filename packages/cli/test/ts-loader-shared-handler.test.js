import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("ts-loader — shared event handler on multiple widgets", () => {
  const fixtureDir = path.join(fixturesDir, "ts-loader-shared-handler");

  before(function () {
    this.timeout(30000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "src");
  });

  it("emits ui_widget_on for every widget when the same handler string is reused", async function () {
    this.timeout(30000);
    await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

    const reactHeader = fs.readFileSync(
      path.join(fixtureDir, "src", "shared-handler.tsx.h"),
      "utf-8"
    );

    // 1) Forward declaration should appear exactly once.
    const declMatches = reactHeader.match(
      /static void on_action\(ui_widget_t \*w, ui_event_t \*e, void \*arg\);/g
    );
    assert.equal(
      declMatches && declMatches.length,
      1,
      "expected exactly one forward declaration for the shared handler"
    );

    // 2) ui_widget_on must be emitted for all three buttons.
    const bindingMatches = reactHeader.match(/ui_widget_on\([^,]+,\s*"click",\s*on_action,\s*w\)/g);
    assert.equal(
      bindingMatches && bindingMatches.length,
      3,
      "expected three ui_widget_on bindings — one per widget sharing the handler"
    );

    // 3) Each binding should target a different ref (ref_0, ref_1, ref_2).
    assert.match(
      reactHeader,
      /ui_widget_on\(_that->refs\.ref_0,\s*"click",\s*on_action,\s*w\)/,
      "expected binding on ref_0"
    );
    assert.match(
      reactHeader,
      /ui_widget_on\(_that->refs\.ref_1,\s*"click",\s*on_action,\s*w\)/,
      "expected binding on ref_1"
    );
    assert.match(
      reactHeader,
      /ui_widget_on\(_that->refs\.ref_2,\s*"click",\s*on_action,\s*w\)/,
      "expected binding on ref_2"
    );
  });
});
