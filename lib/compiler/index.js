import path from "path";
import fs from "fs-extra";
import css from "./css.js";
import sass from "./sass.js";
import xml from "./xml.js";
import yaml from "./yaml.js";
import json from "./json.js";
import javascript from "./javascript.js";
import tsx from "./ts-loader.js";

const compilers = {
  xml,
  yaml,
  json,
  javascript,
  tsx,
  sass,
  css,
};

async function compileFile(filePath, options) {
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
  const result = await compiler.compile(content, { ...options, filePath });
  fs.writeFileSync(`${filePath}.h`, result, { encoding: "utf-8" });
}

export async function compile(file, options) {
  const cwd = process.cwd();
  const projectDir = cwd;
  const appDir = path.join(projectDir, "app");
  const dirs = {
    projectDir,
    appDir,
    buildDir: path.join(projectDir, ".lcui/build"),
    sourceDir: path.join(projectDir, "src"),
    assetsDir: path.join(appDir, "assets"),
  };

  if (fs.existsSync(file)) {
    Object.keys(dirs).forEach((key) => {
      if (!fs.existsSync(dirs[key])) {
        fs.mkdirpSync(dirs[key]);
      }
    })
    await compileFile(file, {
      ...options,
      ...dirs,
      cwd,
    });
  }
}
