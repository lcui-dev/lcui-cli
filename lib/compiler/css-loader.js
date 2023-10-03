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
          const outputPath = (await this.importModule(asset.url)).default;
          if (typeof outputPath !== "string") {
            loader.emitError(
              new Error(
                `${asset.url}: file output path parsing failed. Please check if the file is correctly configured with file-loader`
              )
            );
            return asset.url;
          }
          return outputPath;
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
    headerFiles: ["<ui.h>", `"${path.parse(loader.resourcePath).base}.h"`],
    initCode: `ui_load_css_string(${ident}, ${JSON.stringify(
      path.relative(loader.context, loader.resourcePath)
    )});`,
  };
  await loader.generateModule(loader.resourcePath, () => {
    if (modules) {
      const cssExport = result.messages.find((m) => m.type === "export");
      const cssExportTokens = cssExport ? cssExport.exportTokens : {};
      return (
        `export metadata = ${JSON.stringify(metadata)};\n` +
        `export default ${JSON.stringify(cssExportTokens)};\n\n`
      );
    }
    return result.css;
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
    `/** Generated from: ${this.resourcePath} */`,
    `static const char *${ident} = "\\`,
    `${cssStr.substring(1, cssCode.length - 1)}\\`,
    '";\n',
  ].join("\n");
}
