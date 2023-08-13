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
    return json.compileData(data, options);
  },
};
