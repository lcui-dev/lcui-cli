import path from "path";
import fs from "fs-extra";
import css from "./css.js";
import sass from "./sass.js";
import xml from "./xml.js";
import yaml from "./yaml.js";
import json from "./json.js";
import javascript from "./javascript.js";

const compilers = {
  xml,
  yaml,
  json,
  javascript,
  sass,
  css,
};

function compileFile(filePath, options) {
  if (fs.statSync(filePath).isDirectory()) {
    fs.readdirSync(filePath).forEach((name) => {
      compileFile(path.join(filePath, name), options);
    });
    return;
  }

  let type = options.type;
  if (type === "auto") {
    type = Object.keys(compilers).find((c) => {
      const { test } = compilers[c];
      if (test instanceof Function) {
        return test(filePath);
      }
      return test.test(filePath);
    });
  }

  const compiler = compilers[type];
  if (!compiler) {
    return;
  }

  console.log(`[lcui.${type}] compile ${filePath}`);
  const content = fs.readFileSync(filePath, { encoding: "utf-8" });
  const result = compiler.compile(content, { filePath });
  fs.writeFileSync(`${filePath}.h`, result, { encoding: "utf-8" });
}

export function compile(file, options) {
  const cwd = process.cwd();

  if (fs.existsSync(file)) {
    compileFile(file, {
      ...options,
      cwd,
      projectDir: cwd,
      sourceDir: path.join(cwd, "src"),
    });
  }
}
