import path from "path";
import postcss, { Message } from "postcss";
import postcssUrl from "postcss-url";
import postcssModules from "postcss-modules";
import postcssrc from "postcss-load-config";
import { Loader, LoaderContext, ModuleMetadata, toError } from "../types.js";

interface CSSLoaderOptions {
  modules?: boolean;
}

const CSSLoader: Loader<string | Buffer, string> = async function CSSLoader(
  this: LoaderContext,
  content
) {
  const loader = this;
  const { modules } = loader.getOptions<CSSLoaderOptions>();
  const cssText = `${content}`;
  const processor = postcss().use(
    postcssUrl({
      async url(asset) {
        try {
          const importedModule = await loader.importModule(path.resolve(loader.context, asset.url));
          const outputPath = importedModule.default;
          if (typeof outputPath === "string") {
            return outputPath;
          }
        } catch (err) {
          const e = toError(err);
          e.message = `url(${asset.url}):\n${e.message}`;
          loader.emitError(e);
        }
        loader.emitError(
          new Error(`url(${asset.url}): File does not exist or there is no matching loader`)
        );
        return asset.url;
      },
    })
  );
  if (modules) {
    processor.use(
      postcssModules({
        exportGlobals: true,
        getJSON() {},
      })
    );
  }
  // 通过官方的 postcss-load-config 自动发现并加载 postcss 配置（支持
  // postcss.config.{js,cjs,mjs,ts}、.postcssrc.* 以及 package.json 中的
  // "postcss" 字段）。它同时支持数组语法和对象语法的 plugins，并且对
  // 空 options（null/undefined/{}）会跳过传参，避开某些插件（如
  // postcss-rem-to-px）默认参数被空对象覆盖导致 NaN 的问题。
  try {
    const dir = path.dirname(loader.resourcePath);
    const loaded = await postcssrc({ cwd: dir }, dir);
    loaded.plugins.forEach((plugin) => processor.use(plugin));
    // 把 postcss 配置文件本身记为依赖：用户改 tailwind/postcss 配置时能正确失效缓存。
    if (loaded.file) {
      loader.addDependency(loaded.file);
    }
  } catch (err) {
    const e = toError(err);
    // 项目没有 postcss 配置不是错误，与历史行为一致地静默跳过。
    if (!/No PostCSS Config found/i.test(e.message)) {
      throw err;
    }
  }
  const result = await processor.process(cssText, { from: loader.resourcePath }).async();

  // postcss 插件可通过 message.type === "dependency" / "dir-dependency" 报告读了哪些文件
  // （typical: postcss-import / tailwind 等）。把它们也写进依赖图。
  for (const msg of result.messages) {
    const file = (msg as unknown as { file?: unknown }).file;
    if (msg.type === "dependency" && typeof file === "string") {
      loader.addDependency(file);
    }
  }

  const ident = `css_str_${path.parse(this.resourcePath).name.replace(/[^a-zA-Z0-9]/g, "_")}`;

  const metadata: ModuleMetadata = {
    type: "asset",
    path: loader.resourcePath,
    outputPath: loader.resourceOutputPath,
    headerFiles: ["<ui.h>", `"${loader.resourceOutputPath}"`],
    initCode: `ui_load_css_string(${ident}, ${JSON.stringify(
      path.relative(loader.context, loader.resourcePath)
    )});`,
  };
  await loader.generateModule(loader.resourcePath, () => {
    const metadataStr = JSON.stringify(metadata, null, 2);
    const metadataLine = `export const metadata = ${metadataStr};\n`;
    if (modules) {
      // postcss-modules 通过 message.type === "export" 提供 exportTokens
      const cssExport = result.messages.find((m) => m.type === "export") as
        | (Message & { exportTokens: Record<string, string> })
        | undefined;
      const cssExportTokens = cssExport ? cssExport.exportTokens : {};
      return metadataLine + `export default ${JSON.stringify(cssExportTokens, null, 2)};\n`;
    }
    return metadataLine + `export default ${JSON.stringify(result.css)};\n`;
  });

  const cssStr = JSON.stringify(
    `${result.css}`
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
  )
    .split("\\n")
    .join("\\\n");

  return [
    `/** Generated from: ${path.relative(
      path.dirname(this.resourceOutputPath),
      this.resourcePath
    )} */`,
    `static const char *${ident} = "\\`,
    `${cssStr.substring(1, cssStr.length - 1)}\\`,
    '";\n',
  ].join("\n");
};

export default CSSLoader;
