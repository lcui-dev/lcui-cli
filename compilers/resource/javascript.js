const { compileJson } = require("./json");

function compileJavaScriptFile(filePath) {
  const data = require(filePath);
  return compileJson(data, { filePath });
}

module.exports = {
  compileJavaScriptFile
}
