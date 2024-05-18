import path from "path";
import fs from "fs-extra";
import { cosmiconfig } from "cosmiconfig";

export function toIdent(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

export function getResourceLoaderName(
  fileName: string,
  defaultComponentName?: string
) {
  const ident = toIdent(defaultComponentName || fileName);
  return `ui_load_${ident}_resources`;
}

export function parsePageRoute(context: string, filePath: string) {
  const { dir, name } = path.parse(path.relative(context, filePath));
  return {
    path: `/${dir.replaceAll(path.win32.sep, '/')}`,
    ident: toIdent(`${dir || "root"}_${name}`),
  };
}

export async function loadConfig(context: string, moduleName: string) {
  /** @see https://github.com/webpack-contrib/postcss-loader/blob/b1aecd9b18ede38b0ad4e693a94dadd2b2531429/src/utils.js#L51 */
  const searchPlaces = [
    // Prefer popular format
    "package.json",
    `${moduleName}.config.js`,
    `${moduleName}.config.mjs`,
    `${moduleName}.config.cjs`,
    `.${moduleName}rc`,
    `.${moduleName}rc.json`,
    `.${moduleName}rc.js`,
    `.${moduleName}rc.mjs`,
    `.${moduleName}rc.cjs`,
    `.${moduleName}rc.yaml`,
    `.${moduleName}rc.yml`,
    `.config/${moduleName}rc`,
    `.config/${moduleName}rc.json`,
    `.config/${moduleName}rc.yaml`,
    `.config/${moduleName}rc.yml`,
    `.config/${moduleName}rc.js`,
    `.config/${moduleName}rc.cjs`,
  ];
  const explorer = await cosmiconfig(moduleName, {
    searchStrategy: "global",
    searchPlaces,
  });
  const result = await explorer.search(context);
  if (!result || result.isEmpty) {
    return null;
  }
  return result.config;
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
