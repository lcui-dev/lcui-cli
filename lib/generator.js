const WidgetGenerator = require('../generators/widget');
const ViewGenerator = require('../generators/view');

const generators = {
  widget: WidgetGenerator,
  view: ViewGenerator,
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
