import assert from "assert";
import path from "path";
import { parsePageRoute } from "../lib/utils.js";

describe("parsePageRoute", () => {
  const appDir = path.join("/", "project", "app");

  it('should derive ident "root_page" for app/page.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "page.tsx"));
    assert.strictEqual(result.ident, "root_page");
    assert.strictEqual(result.path, "/");
  });

  it('should derive ident "root_home" for app/home.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "home.tsx"));
    assert.strictEqual(result.ident, "root_home");
    assert.strictEqual(result.path, "/");
  });

  it('should derive ident "root_layout" for app/layout.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "layout.tsx"));
    assert.strictEqual(result.ident, "root_layout");
  });

  it('should derive ident "settings_profile" for app/settings/profile.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "settings", "profile.tsx"));
    assert.strictEqual(result.ident, "settings_profile");
    assert.strictEqual(result.path, "/settings");
  });

  it('should derive ident "settings_page" for app/settings/page.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "settings", "page.tsx"));
    assert.strictEqual(result.ident, "settings_page");
  });

  it('should derive ident "settings_layout" for app/settings/layout.tsx', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "settings", "layout.tsx"));
    assert.strictEqual(result.ident, "settings_layout");
    assert.strictEqual(result.path, "/settings");
  });

  it("should convert dynamic segments to colon syntax", () => {
    const result = parsePageRoute(appDir, path.join(appDir, "users", "[id]", "page.tsx"));
    assert.strictEqual(result.ident, "users_id_page");
    assert.strictEqual(result.path, "/users/:id");
  });

  // 以下用例锁定新规则：parsePageRoute 不再对 components / widgets 目录做特殊处理。
  // 该函数现在只服务 page.tsx / layout.tsx 路由文件；其它 tsx 的命名由
  // ts-loader 走 `displayName || function.name` 这条分支决定，不再走这里。
  // 即便外部传入这类路径，也只是简单 `<dir>_<name>` 拼接。
  it("should lowercase mixed-case dir segments — zh-CN/overview/quick-start/page.tsx → zh_cn_overview_quick_start_page", () => {
    const result = parsePageRoute(appDir, path.join(appDir, "zh-CN", "overview", "quick-start", "page.tsx"));
    assert.strictEqual(result.ident, "zh_cn_overview_quick_start_page");
    assert.strictEqual(result.path, "/zh-CN/overview/quick-start");
  });

  it("no longer strips components dir — components/page.tsx → components_page", () => {
    const result = parsePageRoute(appDir, path.join(appDir, "components", "page.tsx"));
    assert.strictEqual(result.ident, "components_page");
  });

  it("no longer strips widgets dir — widgets/layout.tsx → widgets_layout", () => {
    const result = parsePageRoute(appDir, path.join(appDir, "widgets", "layout.tsx"));
    assert.strictEqual(result.ident, "widgets_layout");
  });
});

