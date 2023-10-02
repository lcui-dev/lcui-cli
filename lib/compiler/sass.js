import fs from "fs-extra";
import path from "path";
import * as sass from "sass";
import css from "./css.js";

export function compileSass(input, filePath) {
  const { dir, ext } = path.parse(filePath);
  return sass.compileString(input, {
    importer: {
      findFileUrl(url) {
        console.log("findFileUrl", url, filePath);
        const resolvedUrl = path.resolve(dir, url);
        const parsedUrl = path.parse(resolvedUrl);
        const result = [
          resolvedUrl,
          `${resolvedUrl}${ext}`,
          path.join(parsedUrl.dir, `_${parsedUrl.base}`),
          path.join(parsedUrl.dir, `_${parsedUrl.base}${ext}`),
          path.join(resolvedUrl, `index${ext}`),
        ].find((item) => fs.existsSync(item) && fs.statSync(item).isFile());
        return result ? new URL(`file://${result}`) : null;
      },
    },
  });
}

export default {
  test(filePath) {
    const { ext, name } = path.parse(filePath);
    return (
      (ext === ".sass" || ext === ".scss") &&
      !name.startsWith("_") &&
      !name.endsWith(".module")
    );
  },
  compile(input, options) {
    const result = compileSass(input, options.filePath);
    return css.compile(result.css);
  },
};
