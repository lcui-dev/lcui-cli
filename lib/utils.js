import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export class FileOperateLogger {
  constructor(cwd) {
    this.cwd = cwd;
  }

  log(type, file) {
    let text = type;

    if (type === 'update') {
      text = chalk.yellow(type);
    } else if (['create', 'output'].includes(type)) {
      text = chalk.green(type);
    }
    console.log(text, path.relative(this.cwd, file));
  }
}

export function getProperty(obj, propertyKey, defaultValue) {
  let selectedProperty = obj;

  propertyKey.split('.').some((key) => {
    selectedProperty = selectedProperty[key];
    if (typeof selectedProperty === 'undefined') {
      return true;
    }
    return false;
  });
  if (typeof selectedProperty === 'undefined') {
    return defaultValue;
  }
  return selectedProperty;
}

export function format(template, data, brackets = ['\\{\\{', '\\}\\}']) {
  const reg = new RegExp(`${brackets[0]}[a-zA-z0-9| _.]+${brackets[1]}`, 'g');
  const filterFnMap = {
    escape(value) {
      if (Array.isArray(value)) {
        return value.map((item) => JSON.stringify(item));
      }
      return JSON.stringify(value);
    },
    join(arr) {
      return arr.join(', ');
    },
    join_with_space(arr) {
      return arr.join(' ');
    }
  };
  return template.replace(reg, (str) => {
    const [key, ...filters] = str.substr(2, str.length - 4).split('|').map((item) => item.trim());
    return filters.reduce(
      (prevValue, filter) => {
        if (typeof filterFnMap[filter] !== 'function') {
          throw new Error(`${filter} is not a filter`);
        }
        return filterFnMap[filter](prevValue);
      },
      getProperty(data, key, '')
    );
  });
}

export function flat(obj) {
  const props = {};

  function flatProps(o, prefix) {
    Object.keys(o).forEach((k) => {
      const key = prefix ? `${prefix}.${k}` : k;

      if (typeof o[k] === 'object') {
        flatProps(o[k], key);
      } else {
        props[key] = o[k];
      }
    });
  }

  flatProps(obj);
  return props;
}

export function generateFile(templateFile, outFile, data = {}) {
  const content = fs.readFileSync(templateFile, { encoding: 'utf-8' });
  fs.writeFileSync(outFile, `\ufeff${format(content, data)}`, { encoding: 'utf-8' });
}

export function loadConfigFile(file) {
  if (!fs.existsSync(input)) {
    throw new Error(`compiler config file not found: ${input}`);
  }
  if (file.endsWith('.json')) {
    return fs.readJSONSync(file);
  }
  if (file.endsWith('.js')) {
    // eslint-disable-next-line no-eval
    return eval(fs.readFileSync(file, { encoding: 'utf-8' }));
  }
  throw new Error('the format of the configuration file is not supported');
}
