const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class Generator {
  constructor(name, options) {
    this.name = name;
    this.cwd = options.cwd;
    this.templatesDir = path.join(__dirname, 'templates');
    this.configDir = path.resolve(this.cwd, 'config');
    if (!fs.existsSync(this.configDir)) {
      throw new Error(`${this.configDir} is not exists!`);
    }
  }

  writeFile(file, content) {
    console.log(chalk.green('writing'), path.relative(this.cwd, file));
    return fs.writeFileSync(file, content);
  }

  readTemplateFile(name) {
    const templateFile = path.join(this.templatesDir, name);
    return fs.readFileSync(templateFile, { encoding: 'utf-8' });
  }

  generateFile(input, output) {
    this.writeFile(output, this.readTemplateFile(input));
  }

  generate() {
    this.generateFile('i18n.js', path.join(this.configDir, 'i18n.js'));
  }
}

module.exports = Generator;
