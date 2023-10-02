import { xml2js } from "xml-js";
import json from "./json.js";

export default {
  test: /\.xml$/,
  compile(input, options) {
    const data = xml2js(input, {
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
    return `/** invalid xml file: ${options.filePath} */`;
  },
};
