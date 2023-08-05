import sass from "sass";
import css from "./css.js";

export default {
  test: /\.s[ac]ss$/,
  compile(file) {
    return css.compile(sass.compile(file));
  },
};
