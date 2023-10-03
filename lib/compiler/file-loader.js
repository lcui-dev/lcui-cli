import path from "path";

/**
 * @param {LoaderContext} loaderContext
 * @param {string} name
 * @returns {string}
 * @see https://github.com/webpack/loader-utils/blob/master/lib/interpolateName.js
 */
function interpolateName(loaderContext, name) {
  let filename;

  if (typeof name === "function") {
    filename = name(loaderContext.resourcePath);
  } else {
    filename = name || "[hash].[ext]";
  }

  let ext = "bin";
  let basename = "file";
  let directory = "";
  let folder = "";
  let url = filename;

  if (loaderContext.resourcePath) {
    const parsed = path.parse(loaderContext.resourcePath);
    let resourcePath = loaderContext.resourcePath;

    if (parsed.ext) {
      ext = parsed.ext.substring(1);
    }

    if (parsed.dir) {
      basename = parsed.name;
      resourcePath = parsed.dir + path.sep;
    }

    directory = resourcePath.replace(/\\/g, "/").replace(/\.\.(\/)?/g, "_$1");

    if (directory.length === 1) {
      directory = "";
    } else if (directory.length > 1) {
      folder = path.basename(directory);
    }
  }

  if (content) {
    url = url.replace(/\[pathhash?(?::(\d+))?\]/gi, (_all, maxLength) =>
      createHash("sha256")
        .update(content)
        .digest("hex")
        .substring(0, parseInt(maxLength, 10))
    );
  }

  return url
    .replace(/\[pathhash?(?::(\d+))?\]/gi, (_all, maxLength) =>
      createHash("sha256")
        .update(loaderContext.resourcePath)
        .digest("hex")
        .substring(0, parseInt(maxLength, 10))
    )
    .replace(/\[ext\]/gi, () => ext)
    .replace(/\[name\]/gi, () => basename)
    .replace(/\[path\]/gi, () => directory)
    .replace(/\[folder\]/gi, () => folder);
}

/**
 *
 * @param {*} resourcePath
 * @param {*} outputPath
 */
function generateMetadata(resourcePath, outputPath) {
  /** @type {ModuleMetadata} */
  const metadata = {
    type: "asset",
    path: resourcePath,
    outputPath: outputPath,
  };

  if (/\.(ttf|woff|woff2)$/i.test(resourcePath)) {
    metadata.headerFiles = ["<pandagl.h>"];
    metadata.initCode = `pd_font_library_load_file(${JSON.stringify(
      this.resourceOutputPath
    )});`;
  }
  return metadata;
}

/** @type {Loader} */
export default async function FileLoader() {
  await this.generateModule(this.resourcePath, () => {
    const { outputPath, name } = this.getOptions();
    const filePath = path.join(outputPath, interpolateName(this, name));
    const metadata = generateMetadata(this.resourcePath, filePath);
    return (
      `export const metadata = ${JSON.stringify(metadata)};\n` +
      `export default ${JSON.stringify(filePath)};\n\n`
    );
  });
}
