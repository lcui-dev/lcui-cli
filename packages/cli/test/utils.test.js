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

  it('app/components/page.tsx should keep dir prefix → "components_page"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "components", "page.tsx"));
    assert.strictEqual(result.ident, "components_page");
  });

  it('app/components/button.tsx should strip "components" → "button"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "components", "button.tsx"));
    assert.strictEqual(result.ident, "button");
  });

  it('app/chat/components/message.tsx should strip "components" → "chat_message"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "chat", "components", "message.tsx"));
    assert.strictEqual(result.ident, "chat_message");
  });

  it('app/widgets/page.tsx should keep dir prefix → "widgets_page"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "widgets", "page.tsx"));
    assert.strictEqual(result.ident, "widgets_page");
  });

  it('app/widgets/button.tsx should strip "widgets" → "button"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "widgets", "button.tsx"));
    assert.strictEqual(result.ident, "button");
  });

  it('app/chat/widgets/message.tsx should strip "widgets" → "chat_message"', () => {
    const result = parsePageRoute(appDir, path.join(appDir, "chat", "widgets", "message.tsx"));
    assert.strictEqual(result.ident, "chat_message");
  });
});
