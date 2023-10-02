import path from 'path';

/**
 * @type {Loader}
 */
export default function SassLoader(content) {
  const { dir, ext } = path.parse(this.resourcePath);
  return sass.compileString(content, {
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
}
