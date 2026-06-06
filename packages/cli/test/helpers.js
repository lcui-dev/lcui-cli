import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");
export const monorepoRoot = path.resolve(__dirname, "..", "..", "..");
export const fixturesDir = path.join(__dirname, "fixtures");

/**
 * `compile()` 内部通过 `process.cwd()` 定位项目根目录，所以测试需要
 * 切换 cwd 到 fixture 目录后再调用，并在结束时恢复。
 */
export async function withCwd(dir, fn) {
  const original = process.cwd();
  process.chdir(dir);
  try {
    return await fn();
  } finally {
    process.chdir(original);
  }
}

/**
 * ts-loader 在编译 .tsx 时会 `import("file://<fixture>/node_modules/@lcui/react")` 等，
 * 所以每个 fixture 必须能在自身 node_modules 里找到 @lcui/react。
 * 在 monorepo 中，@lcui/react 通常被 hoist 到根 node_modules；
 * 若包内 node_modules 没有则回退到根 node_modules 查找。
 */
export function ensureLcuiReact(fixtureDir) {
  const candidates = [
    path.join(repoRoot, "node_modules", "@lcui", "react"),
    path.join(monorepoRoot, "node_modules", "@lcui", "react"),
  ];
  const src = candidates.find((p) => fs.existsSync(p));
  if (!src) {
    throw new Error(
      `@lcui/react not found in ${candidates.join(" or ")}. Did you run \`npm install\`?`
    );
  }
  const dst = path.join(fixtureDir, "node_modules", "@lcui", "react");
  fs.removeSync(dst);
  fs.copySync(src, dst, { dereference: true });
}

/** 清掉一次 compile() 留下的所有产物（包括我们 .gitignore 屏蔽的）。 */
export function cleanGenerated(fixtureDir, sourceSubdir) {
  fs.removeSync(path.join(fixtureDir, ".lcui"));
  fs.removeSync(path.join(fixtureDir, "dist"));
  fs.removeSync(path.join(fixtureDir, "vendor.node_modules"));
  const sourceDir = path.join(fixtureDir, sourceSubdir);
  if (fs.existsSync(sourceDir)) {
    fs.readdirSync(sourceDir).forEach((name) => {
      if (/\.(c|h)$/.test(name)) {
        fs.removeSync(path.join(sourceDir, name));
      }
    });
  }
}
