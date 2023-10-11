import path from "path";
import postcss from "postcss";
import postcssUrl from "postcss-url";
import postcssModules from "postcss-modules";

/** @type {Loader} */
export default async function CSSLoader(content) {
  const loader = this;
  const { modules } = loader.getOptions();
  const cssText = `${content}`;
  const result = await postcss(
    [
      postcssUrl({
        async url(asset) {
          try {
            const outputPath = (
              await loader.importModule(path.resolve(loader.context, asset.url))
            ).default;
            if (typeof outputPath === "string") {
              return outputPath;
            }
          } catch (err) {
            err.message = `url(${asset.url}):\n${err.message}`;
            loader.emitError(err);
          }
          loader.emitError(
            new Error(
              `url(${asset.url}): File does not exist or there is no matching loader`
            )
          );
          return asset.url;
        },
      }),
      modules &&
        postcssModules({
          exportGlobals: true,
          getJSON() {},
        }),
    ].filter(Boolean)
  )
    .process(cssText, { from: loader.resourcePath })
    .async();

  const ident = `css_str_${path
    .parse(this.resourcePath)
    .name.replace(/[^a-zA-Z0-9]/g, "_")}`;

  /** @type {ModuleMetadata} */
  const metadata = {
    type: "asset",
    path: loader.resourcePath,
    outputPath: loader.outputPath,
    headerFiles: ["<ui.h>", `"${loader.resourceOutputPath}"`],
    initCode: `ui_load_css_string(${ident}, ${JSON.stringify(
      path.relative(loader.context, loader.resourcePath)
    )});`,
  };
  await loader.generateModule(loader.resourcePath, () => {
    const metadataStr = JSON.stringify(metadata, null, 2);
    const metadataLine = `export const metadata = ${metadataStr};\n`;
    if (modules) {
      const cssExport = result.messages.find((m) => m.type === "export");
      const cssExportTokens = cssExport ? cssExport.exportTokens : {};
      return (
        metadataLine +
        `export default ${JSON.stringify(cssExportTokens, null, 2)};\n`
      );
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
    `/** Generated from: ${path.relative(path.dirname(this.resourceOutputPath), this.resourcePath)} */`,
    `static const char *${ident} = "\\`,
    `${cssStr.substring(1, cssStr.length - 1)}\\`,
    '";\n',
  ].join("\n");
}
