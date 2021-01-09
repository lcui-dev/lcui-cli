const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { snakeCase, pascalCase, paramCase } = require('change-case');
const { format } = require('../../lib/utils');

class Generator {
  constructor(name, options) {
    this.data = {
      className: `${pascalCase(name)}View`,
      variableName: snakeCase(name),
      fileName: paramCase(name),
      cssName: paramCase(name),
      tagName: paramCase(name)
    };
    this.cwd = options.cwd;
    this.sourceDir = path.join(this.cwd, 'src/ui');
    this.styleDir = path.join(this.cwd, 'src/ui/stylesheets');
    this.viewsDir = path.join(this.cwd, 'app/assets/views');
    this.viewsSourceDir = path.join(this.sourceDir, 'views');
    this.viewsStyleDir = path.join(this.styleDir, 'views');
    this.templatesDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(this.viewsSourceDir)) {
      throw new Error(`${this.viewsSourceDir} is not exists!`);
    }
    if (!fs.existsSync(this.styleDir)) {
      throw new Error(`${this.styleDir} is not exists!`);
    }
    if (!fs.existsSync(this.viewsStyleDir)) {
      throw new Error(`${this.viewsStyleDir} is not exists!`);
    }
  }

  updateViewsSourceFile() {
    let indexOfMain = -1;
    let lastIndexOfInclude = -1;
    let lastIndexOfFunc = -1;
    const file = path.join(this.sourceDir, 'views.c');
    const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n');
    const includeCode = `#include "views/${this.data.fileName}.h"`;
    const initFuncCode = `UI_Init${this.data.className}()`;

    lines.forEach((line, index) => {
      if (line.includes('#include')) {
        lastIndexOfInclude = index;
      } else if (line.includes('UI_InitViews')) {
        indexOfMain = index;
      } else if (line.includes(initFuncCode)) {
        lastIndexOfFunc = index;
      }
    });
    if (indexOfMain === -1) {
      throw new Error('cannot update UI_InitViews() function body.');
    }
    if (lastIndexOfFunc === -1) {
      lastIndexOfFunc = indexOfMain + 2;
    }
    lines.splice(lastIndexOfFunc, 0, `\t${initFuncCode};`);
    lines.splice(lastIndexOfInclude + 1, 0, includeCode);
    console.log(chalk.yellow('update'), path.relative(this.cwd, file));
    return fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf-8' });
  }

  updateViewsStyleFile() {
    let lastIndexOfImport = -1;
    const importCode = `@import "views/${this.data.cssName}";`;
    const file = path.join(this.styleDir, '_views.scss');
    const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n');

    lines.forEach((line, index) => {
      if (line.includes('@import')) {
        lastIndexOfImport = index;
      }
    });
    lines.splice(lastIndexOfImport + 1, 0, importCode);
    if (lines[lines.length - 1]) {
      lines.push('');
    }
    console.log(chalk.yellow('update'), path.relative(this.cwd, file));
    return fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf-8' });
  }

  generateFile(input, output) {
    const templateFile = path.join(this.templatesDir, input);
    const content = fs.readFileSync(templateFile, { encoding: 'utf-8' });

    console.log(chalk.green('create'), path.relative(this.cwd, output));
    return fs.writeFileSync(output, format(content, this.data));
  }

  generate() {
    const name = this.data.fileName;
    const xmlFile = path.join(this.viewsDir, `${name}.xml`);
    const sourceFile = path.join(this.viewsSourceDir, `${name}.c`);
    const headerFile = path.join(this.viewsSourceDir, `${name}.h`);
    const styleFile = path.join(this.viewsStyleDir, `_${name}.scss`);

    this.generateFile('view.c', sourceFile);
    this.generateFile('view.h', headerFile);
    this.generateFile('view.xml', xmlFile);
    this.generateFile('view.scss', styleFile);

    this.updateViewsSourceFile();
    this.updateViewsStyleFile();
  }
}

module.exports = Generator;
