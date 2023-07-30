import path from "path";
import ResourceCompiler from "../compilers/resource/index.js";
import RouterConfigCompiler from "../compilers/router/index.js";

const compilers = {
  router: RouterConfigCompiler,
  resource: ResourceCompiler,
};

export function compile(type) {
  const cwd = process.cwd();
  const Compiler = compilers[type];

  if (typeof Compiler === "undefined") {
    throw new Error(`compiler not found: ${type}`);
  }

  return new Compiler({
    cwd,
    configFile: path.resolve(cwd, "config", `${type}.js`),
  }).compile();
}
