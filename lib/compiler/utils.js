
export function toIdent(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

export function getResourceLoaderName(fileName, defaultComponentName) {
  const ident = toIdent(defaultComponentName || fileName);
  return `ui_load_${ident}_resources`;
}
