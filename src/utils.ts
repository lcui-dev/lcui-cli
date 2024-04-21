import path from 'path';

export function toIdent(str: string) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

export function getResourceLoaderName(fileName: string, defaultComponentName?: string) {
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
