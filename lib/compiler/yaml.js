import { parse } from "yaml";
import json from "./json.js";

export default {
  test: /\.ya?ml$/,
  compile(input, options) {
    const data = parse(input);
    return json.compile(data, options);
  },
};
