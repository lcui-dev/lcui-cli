import assert from "assert";
import fs from "fs-extra";
import path from "path";
import compile from "../lib/compiler/index.js";
import { fixturesDir, withCwd, ensureLcuiReact, cleanGenerated } from "./helpers.js";

describe("css-loader — tailwindcss integration", () => {
  const fixtureDir = path.join(fixturesDir, "css-loader-tailwind");

  before(function () {
    this.timeout(60000);
    ensureLcuiReact(fixtureDir);
    cleanGenerated(fixtureDir, "app");
  });

  it("expands @tailwind / @apply via postcss.config.js + tailwind.config.js", async function () {
    this.timeout(60000);
    await withCwd(fixtureDir, () => compile(undefined, {}));

    const cssHPath = path.join(fixtureDir, "app", "global.css.h");
    assert.ok(fs.existsSync(cssHPath), `expected css-loader to emit ${cssHPath}`);
    const cssH = fs.readFileSync(cssHPath, "utf-8");

    // 1. 头文件骨架仍在：css-loader 应当生成 `static const char *css_str_global = ...`
    assert.match(cssH, /static const char \*css_str_global\s*=/);

    // 2. tailwind 必须把 @tailwind / @apply 全部消除掉
    //    （这是判定 tailwindcss 是否真正工作的最关键依据）
    assert.doesNotMatch(cssH, /@tailwind\b/);
    assert.doesNotMatch(cssH, /@apply\b/);

    // 3. 用户重点指定的 h4 规则必须被展开为真实 CSS 属性
    //    text-xl → font-size; font-bold → font-weight:700;
    //    text-gray-900 → color; mb-2 → margin-bottom
    //    用宽松正则跨 tailwind 小版本兼容。
    const h4BlockMatch = cssH.match(/h4\s*\{([\s\S]*?)\}/);
    assert.ok(h4BlockMatch, "expected an h4 { ... } block in generated CSS");
    const h4Block = h4BlockMatch[1];
    assert.match(h4Block, /font-size\s*:/);
    assert.match(h4Block, /font-weight\s*:\s*700/);
    assert.match(h4Block, /color\s*:/);
    assert.match(h4Block, /margin-bottom\s*:/);

    // 4. postcss-rem-to-px 已生效：所有 tailwind 默认产出的 rem 数值
    //    都应该被转换成 px，产物里不应再出现 rem 单位。
    assert.doesNotMatch(cssH, /\d(?:\.\d+)?rem\b/);
  });
});
