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

const COMPONENT_DIRS = new Set(["components", "widgets"]);

export function parsePageRoute(context: string, filePath: string) {
  const { dir, name } = path.parse(path.relative(context, filePath));
  const dirParts = dir ? dir.split(path.sep) : [];
  const isPageOrLayout = name === "page" || name === "layout";
  let ident: string;
  if (!isPageOrLayout && dirParts.some((p) => COMPONENT_DIRS.has(p))) {
    const stripped = dirParts.filter((p) => !COMPONENT_DIRS.has(p));
    ident = stripped.length > 0 ? toIdent(`${stripped.join(path.sep)}_${name}`) : name;
  } else {
    ident = toIdent(`${dir || "root"}_${name}`);
  }
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
