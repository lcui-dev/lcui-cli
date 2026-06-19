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

describe("ts-loader — prefix-aware internal component naming", () => {
  describe("skip injection when funcName already starts with filePrefix", () => {
    const fixtureDir = path.join(fixturesDir, "ts-loader-prefix-overlap");

    before(function () {
      this.timeout(30000);
      ensureLcuiReact(fixtureDir);
      cleanGenerated(fixtureDir, "src");
    });

    it("does not duplicate file prefix for FieldTableProvider in field-table.tsx", async function () {
      this.timeout(30000);
      await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

      const tsxH = fs.readFileSync(path.join(fixtureDir, "src", "field-table.tsx.h"), "utf-8");
      const fieldTableH = fs.readFileSync(path.join(fixtureDir, "src", "field-table.h"), "utf-8");
      const mainH = fs.readFileSync(path.join(fixtureDir, "src", "main.h"), "utf-8");

      // FieldTable (default export) → field_table (defaultComponentSnakeName)
      assert.match(tsxH, /field_table_proto/, "default component should use snake_case function name: field_table");
      assert.match(tsxH, /ui_create_widget_prototype\("field_table"/, "FieldTable should register prototype 'field_table'");
      assert.match(fieldTableH, /void ui_register_field_table\(void\);/, "should declare ui_register_field_table");
      assert.match(mainH, /ui_register_field_table\(\);/, "main.h should call ui_register_field_table()");

      // FieldTableProvider (internal) → field_table_provider (no redundant prefix; funcName already has filePrefix)
      assert.match(tsxH, /field_table_provider_proto/, "FieldTableProvider should NOT have redundant 'field_table_field_table_' prefix");
      assert.doesNotMatch(tsxH, /field_table_field_table_provider/, "must not produce redundant prefix 'field_table_field_table_provider'");
      assert.match(tsxH, /ui_create_widget_prototype\("field_table_provider"/, "FieldTableProvider registers as 'field_table_provider'");
      assert.match(fieldTableH, /void ui_register_field_table_provider\(void\);/, "should declare ui_register_field_table_provider");
      assert.match(mainH, /ui_register_field_table_provider\(\);/, "main.h should call ui_register_field_table_provider()");

      // FieldTable's template should reference FieldTableProvider without redundant prefix
      assert.match(tsxH, /ui_create_widget\("field_table_provider"\)/, "template should reference 'field_table_provider' widget");
    });
  });

  describe("preserve user-set explicit displayName", () => {
    const fixtureDir = path.join(fixturesDir, "ts-loader-explicit-displayname");

    before(function () {
      this.timeout(30000);
      ensureLcuiReact(fixtureDir);
      cleanGenerated(fixtureDir, "src");
    });

    it("uses the explicit displayName verbatim instead of generating prefixed name", async function () {
      this.timeout(30000);
      await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

      const tsxH = fs.readFileSync(path.join(fixtureDir, "src", "widgets.tsx.h"), "utf-8");
      const widgetsH = fs.readFileSync(path.join(fixtureDir, "src", "widgets.h"), "utf-8");
      const mainH = fs.readFileSync(path.join(fixtureDir, "src", "main.h"), "utf-8");

      // WidgetsApp (default export) → widgets_app
      assert.match(tsxH, /widgets_app_proto/, "default export should use function name: widgets_app");
      assert.match(mainH, /ui_register_widgets_app\(\);/, "main.h should call ui_register_widgets_app()");

      // AnotherWidget (named export) → another_widget
      assert.match(tsxH, /another_widget_proto/, "named export should use snake_case function name: another_widget");
      assert.match(mainH, /ui_register_another_widget\(\);/, "main.h should call ui_register_another_widget()");

      // MyWidget (internal, has explicit displayName = "custom_widget_name") → custom_widget_name
      assert.match(tsxH, /custom_widget_name_proto/, "internal component with explicit displayName should use 'custom_widget_name'");
      assert.doesNotMatch(tsxH, /widgets__my_widget/, "must not inject '__' separator prefix for explicitly-named components");
      assert.doesNotMatch(tsxH, /widgets_my_widget/, "must not inject prefix for explicitly-named components");
      assert.match(widgetsH, /void ui_register_custom_widget_name\(void\);/, "should declare ui_register_custom_widget_name");
      assert.match(mainH, /ui_register_custom_widget_name\(\);/, "main.h should call ui_register_custom_widget_name()");

      // Template should reference the explicit displayName
      assert.match(tsxH, /ui_create_widget\("custom_widget_name"\)/, "template should use explicit displayName as widget tag");
      assert.match(tsxH, /ui_create_widget\("another_widget"\)/, "template should reference another_widget by its natural name");
    });
  });

  describe("internal components in page.tsx under AppRouter", () => {
    const fixtureDir = path.join(fixturesDir, "ts-loader-page-internal");

    before(function () {
      this.timeout(30000);
      ensureLcuiReact(fixtureDir);
      cleanGenerated(fixtureDir, "app");
    });

    it("injects 'page__' (double underscore) for Header and uses 'page_header' (single) for PageHeader", async function () {
      this.timeout(30000);
      await withCwd(fixtureDir, () => compile(undefined, { skipXMake: true }));

      const tsxH = fs.readFileSync(path.join(fixtureDir, "app", "page.tsx.h"), "utf-8");
      const pageH = fs.readFileSync(path.join(fixtureDir, "app", "page.h"), "utf-8");
      const mainH = fs.readFileSync(path.join(fixtureDir, "app", "main.h"), "utf-8");

      // Page (default export, route-derived) → root_page
      assert.match(tsxH, /root_page_proto/, "default export in page.tsx should be route-derived: root_page");
      assert.match(mainH, /ui_register_root_page\(\);/, "main.h should call ui_register_root_page()");

      // Header (internal, needs page__ prefix — file prefix is "page")
      assert.match(tsxH, /page__header_proto/, "Header should use 'page__header' with double underscore separator");
      assert.match(tsxH, /ui_create_widget_prototype\("page__header"/, "Header registers prototype 'page__header'");
      assert.match(pageH, /void ui_register_page__header\(void\);/, "page.h should declare ui_register_page__header");
      assert.match(mainH, /ui_register_page__header\(\);/, "main.h should call ui_register_page__header()");

      // PageHeader (internal, funcName snake_case "page_header" already starts with filePrefix "page")
      // → no injection, uses natural function.name → snakeCase("PageHeader") = "page_header"
      assert.match(tsxH, /page_header_proto/, "PageHeader should use natural snake_case: page_header");
      assert.match(tsxH, /ui_create_widget_prototype\("page_header"/, "PageHeader registers prototype 'page_header'");
      assert.doesNotMatch(tsxH, /page__page_header/, "must not inject prefix for PageHeader (already starts with 'page')");
      assert.match(pageH, /void ui_register_page_header\(void\);/, "page.h should declare ui_register_page_header");
      assert.match(mainH, /ui_register_page_header\(\);/, "main.h should call ui_register_page_header()");

      // Both names are distinct — no collision
      assert.match(tsxH, /ui_create_widget\("page__header"\)/, "Page template should reference Header as 'page__header'");
      assert.match(tsxH, /ui_create_widget\("page_header"\)/, "Page template should reference PageHeader as 'page_header'");
    });
  });
});