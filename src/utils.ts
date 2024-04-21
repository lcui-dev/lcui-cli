import path from "path";
import { cosmiconfig } from "cosmiconfig";
import { LoaderContext } from "./types.js";

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

export async function loadConfig(loaderContext: LoaderContext, moduleName: string) {
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
  const result = await explorer.search(path.dirname(loaderContext.resourcePath));
  if (!result || result.isEmpty) {
    return null;
  }
  return result.config;
}
