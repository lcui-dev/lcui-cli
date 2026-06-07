import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import * as sass from "sass";
import fs from "fs-extra";
import { Loader, LoaderContext } from "../types.js";

const SassLoader: Loader<string | Buffer, string> = function SassLoader(
  this: LoaderContext,
  content
) {
  const loader = this;
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
        return result ? pathToFileURL(result) : null;
      },
    },
  });
  // 把 sass 编译过程中加载过的所有 @use / @import 文件全部上报为依赖，
  // 这样下一次 build 时若任意 partial 被改动都能正确失效缓存。
  for (const u of result.loadedUrls ?? []) {
    try {
      if (u.protocol === "file:") {
        loader.addDependency(fileURLToPath(u));
      }
    } catch {
      // 忽略非文件 URL
    }
  }
  return result.css;
};

export default SassLoader;
