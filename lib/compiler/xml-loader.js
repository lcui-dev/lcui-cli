import { xml2js } from "xml-js";

/**
 * @type {Loader}
 */
export default function XMLLoader(content) {
  const data = xml2js(content, {
    ignoreCdata: true,
    ignoreDeclaration: true,
    ignoreComment: true,
    ignoreInstruction: true,
    ignoreDoctype: true,
    elementsKey: 'children'
  });
  const root = data.children.find((node) => node.name === 'lcui-app');
  if (root) {
    return json.compileData(root, options);
  }
  this.emitError(new Error('invalid xml file'));
}
