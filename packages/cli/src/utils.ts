import path from "path";
import fs from "fs-extra";
import { snakeCase } from "change-case-all";

export function toIdent(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_").replace(/_{2,}/g, "_");
}

export function getResourceLoaderName(fileName: string, defaultComponentName?: string) {
  const ident = snakeCase(defaultComponentName || fileName);
  return `ui_load_${ident}_resources`;
}

/**
 * 解析 app 路由下的 page.tsx / layout.tsx 路径，得到：
 * - `ident`：用作 C 标识符的 widget 名（由目录 + 文件名拼接，再 snakeCase 转全小写）。
 *   例如 `app/settings/page.tsx` → `settings_page`、`app/page.tsx` → `root_page`。
 *   使用 `snakeCase` 而非 `toIdent` 是为了与 ts-loader 中 `snakeCase()` 的行为保持一致，
 *   确保路由器配置中的组件名与组件实际注册的 prototype 名相同（如 `zh-CN` → `zh_cn`）。
 * - `path`：对应的路由路径，`[foo]` 段会转成 `:foo`。
 *
 * 注意：本函数只服务 `page.tsx` / `layout.tsx` 这类路由文件。其它 tsx 文件
 * （包括 `components/xxx.tsx`、`examples/foo/index.tsx`）的命名由
 * ts-loader 走 `displayName || function.name` 这条分支决定，避免出现
 * "原型名与被 import 后的 widget tag 名不一致" 的问题。
 */
export function parsePageRoute(context: string, filePath: string) {
  const { dir, name } = path.parse(path.relative(context, filePath));
  const ident = snakeCase(`${dir || "root"}_${name}`);
  // Convert path, e.g. "/[foo]/bar" to "/:foo/bar"
  return {
    path: `/${dir.replaceAll(path.win32.sep, "/").replace(/\[([^\]]+)\]/g, ":$1")}`,
    ident,
  };
}

export function resolveRootDir() {
  let dir = process.cwd();
  const configFiles = ["package.json", "lcui.config.js"];

  do {
    if (configFiles.some((file) => fs.existsSync(path.join(dir, file)))) {
      return dir;
    }
    dir = path.dirname(dir);
  } while (path.parse(dir).base);
  throw new Error(
    "Unable to determine the project root directory, please add the package.json file to the project root directory"
  );
}
