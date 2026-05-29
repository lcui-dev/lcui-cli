import path from "path";
import postcss, { Message } from "postcss";
import postcssUrl from "postcss-url";
import postcssModules from "postcss-modules";
import { Loader, LoaderContext, ModuleMetadata, toError } from "../types.js";
import { loadConfig } from "../utils.js";

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
  const customConfig = (await loadConfig(path.dirname(loader.resourcePath), "postcss")) as null | {
    plugins?: postcss.AcceptedPlugin[];
  };
  if (customConfig && Array.isArray(customConfig.plugins)) {
    customConfig.plugins.forEach((plugin) => processor.use(plugin));
  }
  const result = await processor.process(cssText, { from: loader.resourcePath }).async();

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
