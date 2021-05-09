const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const logger = require('./logger');
const { generate } = require('./generator');

function installDependencies() {
  const scriptFile = path.resolve(process.cwd(), 'setup.sh');

  logger.log(`\n${chalk.grey('[setup::dependencies]')}`);
  if (process.platform === 'win32') {
    if (execSync('lcpkg --version')) {
      logger.log('> lcpkg install --arch x64\n');
      execSync('lcpkg install --arch x64', { stdio: 'inherit' });
    } else {
      logger.warning('lcpkg is missing');
    }
  } else if (fs.existsSync(scriptFile)) {
    logger.log(`> sh ${scriptFile}\n`);
    execSync(`sh ${scriptFile}`, { stdio: 'inherit' });
  }
}

function generateMakefiles() {
  logger.log(`\n${chalk.grey('[setup::makefiles]')}`);
  generate('makefile', 'xmake');
  generate('makefile', 'cmake');
}

function setup() {
  installDependencies();
  generateMakefiles();
}

module.exports = {
  setup
};
