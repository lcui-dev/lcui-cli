import json from "./json.js";

export default {
  test: /\.js$/,
  compile(input, options) {
    const module = { exports: {} };
    eval(input);
    return json.compileData(module.exports, options);
  }
}
