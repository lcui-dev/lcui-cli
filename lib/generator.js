const WidgetGenerator = require('../generators/widget');
const ViewGenerator = require('../generators/view');
const MakefileGenerator = require('../generators/makefile');

const generators = {
  widget: WidgetGenerator,
  view: ViewGenerator,
  makefile: MakefileGenerator,
};

function generate(type, name) {
  const Generator = generators[type];

  if (typeof Generator === 'undefined') {
    throw new Error(`generator not found: ${type}`);
  }
  return new Generator(name, { cwd: process.cwd() }).generate();
}

module.exports = {
  generate
};
