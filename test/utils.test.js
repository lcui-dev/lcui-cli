import assert from "assert";
import path from "path";
import { snakeCase } from "change-case-all";
import {
  stripCommonDirPrefixes,
  parsePageRoute,
} from "../lib/utils.js";

describe("stripCommonDirPrefixes", () => {
  it('should remove leading "app" prefix', () => {
    assert.strictEqual(stripCommonDirPrefixes("app_home"), "home");
  });

  it('should remove leading "src" prefix', () => {
    assert.strictEqual(stripCommonDirPrefixes("src_button"), "button");
  });

  it("should remove multiple consecutive leading common prefixes", () => {
    assert.strictEqual(stripCommonDirPrefixes("app_src_button"), "button");
  });

  it('should preserve single-word name "app" (no underscore)', () => {
    assert.strictEqual(stripCommonDirPrefixes("app"), "app");
  });

  it('should preserve single-word name "src" (no underscore)', () => {
    assert.strictEqual(stripCommonDirPrefixes("src"), "src");
  });

  it("should not strip non-common prefixes", () => {
    assert.strictEqual(stripCommonDirPrefixes("home"), "home");
    assert.strictEqual(
      stripCommonDirPrefixes("settings_profile"),
      "settings_profile"
    );
  });

  it("should strip common prefix but keep the rest intact", () => {
    assert.strictEqual(
      stripCommonDirPrefixes("app_settings_profile"),
      "settings_profile"
    );
  });
});

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
    const result = parsePageRoute(
      appDir,
      path.join(appDir, "settings", "profile.tsx")
    );
    assert.strictEqual(result.ident, "settings_profile");
    assert.strictEqual(result.path, "/settings");
  });

  it('should derive ident "settings_page" for app/settings/page.tsx', () => {
    const result = parsePageRoute(
      appDir,
      path.join(appDir, "settings", "page.tsx")
    );
    assert.strictEqual(result.ident, "settings_page");
  });
});

describe("component naming: parsePageRoute + snakeCase + stripCommonDirPrefixes", () => {
  function getComponentName(appDir, filePath) {
    const ident = parsePageRoute(appDir, filePath).ident;
    return stripCommonDirPrefixes(snakeCase(ident));
  }

  const appDir = path.join("/", "project", "app");

  it('app/home.tsx should produce "root_home"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "home.tsx")),
      "root_home"
    );
  });

  it('app/page.tsx should produce "root_page"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "page.tsx")),
      "root_page"
    );
  });

  it('app/settings/profile.tsx should produce "settings_profile"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "settings", "profile.tsx")),
      "settings_profile"
    );
  });

  it('app/settings/page.tsx should produce "settings_page"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "settings", "page.tsx")),
      "settings_page"
    );
  });

  it('app/app/home.tsx (nested "app" subdir) should strip leading "app" prefix to produce "home"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "app", "home.tsx")),
      "home"
    );
  });

  it('app/src/button.tsx (nested "src" subdir) should strip leading "src" prefix to produce "button"', () => {
    assert.strictEqual(
      getComponentName(appDir, path.join(appDir, "src", "button.tsx")),
      "button"
    );
  });
});
