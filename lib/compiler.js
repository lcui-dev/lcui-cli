const fs = require('fs');
const path = require('path');
const I18nConfigCompiler = require('../compilers/i18n');
const RouterConfigCompiler = require('../compilers/router');

const compilers = {
  i18n: I18nConfigCompiler,
  router: RouterConfigCompiler
};

function compile(type) {
  const cwd = process.cwd();
  const input = path.resolve(cwd, 'config', `${type}.js`);
  const Compiler = compilers[type];

  if (typeof Compiler === 'undefined') {
    throw new Error(`compiler not found: ${type}`);
  }
  if (!fs.existsSync(input)) {
    throw new Error(`compiler config file not found: ${input}`);
  }

  return new Compiler({ cwd }).compile(input);
}

module.exports = {
  compile
};
