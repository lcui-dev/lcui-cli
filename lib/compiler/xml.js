import { XMLParser } from "fast-xml-parser";
import json from "./json.js";

export default {
  test: /\.xml$/,
  compile(input, options) {
    const parser = new XMLParser({
      ignoreAttributes: false,
      ignorePiTags: true,
      allowBooleanAttributes: true,
      attributeNamePrefix: "@",
    });
    const xmlData = parser.parse(input);
    return json.compile(xmlData["lcui-app"], options);
  },
};
