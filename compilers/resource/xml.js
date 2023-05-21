const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");
const { compileJson } = require("./json");

function compileXmlFile(filePath) {
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

module.exports = {
  compileXmlFile
};
