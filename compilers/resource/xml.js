import fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { compileJson } from "./json.js";

export function compileXmlFile(filePath) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    ignorePiTags: true,
    allowBooleanAttributes: true,
    attributeNamePrefix: "@",
  });
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const xmlData = parser.parse(content);
  return compileJson(xmlData["lcui-app"], { filePath });
}
