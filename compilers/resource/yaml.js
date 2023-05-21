const fs = require("fs");
const { parse } = require('yaml');
const { compileJson } = require("./json");

function compileYamlFile(filePath) {
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const data = parse(content);
  return compileJson(data, { filePath });
}

module.exports = {
  compileYamlFile
}
