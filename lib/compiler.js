const path = require("path");
const I18nConfigCompiler = require("../compilers/i18n");
const ResourceCompiler = require("../compilers/resource");
const RouterConfigCompiler = require("../compilers/router");

const compilers = {
  i18n: I18nConfigCompiler,
  router: RouterConfigCompiler,
  resource: ResourceCompiler,
};

function compile(type) {
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

module.exports = {
  compile,
};
