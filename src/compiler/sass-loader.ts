import path from "path";
import * as sass from "sass";
import fs from "fs-extra";
import { LoaderContext } from "../types.js";

export default function SassLoader(this: LoaderContext, content: string) {
  const { dir, ext } = path.parse(this.resourcePath);
  const result = sass.compileString(`${content}`, {
    importer: {
      findFileUrl(url) {
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
  return result.css;
}
