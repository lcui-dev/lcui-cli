import WidgetGenerator from '../generators/widget/index.js';
import ViewGenerator from '../generators/view/index.js';

const generators = {
  widget: WidgetGenerator,
  view: ViewGenerator,
};

export function generate(type, name) {
  const Generator = generators[type];

  if (typeof Generator === 'undefined') {
    throw new Error(`generator not found: ${type}`);
  }
  return new Generator(name, { cwd: process.cwd() }).generate();
}
