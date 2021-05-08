#!/usr/bin/env node

const program = require('commander');
const logger = require('../lib/logger');
const { create } = require('../lib/create');
const { setup } = require('../lib/setup');
const { generate } = require('../lib/generator');
const { compile } = require('../lib/compiler');
const { build, run } = require('../lib/builder');
const { version } = require('../package.json');

function wrapAction(action) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (err) {
      logger.error(err.message);
      process.exit(err.code);
    }
  };
}

program
  .command('create <project-name>')
  .description('create a new LCUI project')
  .action(wrapAction(create));

program
  .command('generate <type> <name>')
  .description('generate files with template of specified type')
  .action(wrapAction(generate));

program
  .command('setup')
  .description('set up the development environment for the current project')
  .action(wrapAction(setup));

program
  .command('compile <type>')
  .description('compile config file of the specified type to C code')
  .action(wrapAction(compile));

program
  .command('build')
  .description('build project')
  .option('-m, --mode <mode>', 'specify build mode', (mode, defaultMode) => {
    if (['release', 'debug'].includes(mode.toLowerCase())) {
      return mode.toLowerCase();
    }
    return defaultMode;
  }, 'debug')
  .option('-t, --tool <tool>', 'specify build tool', (tool, defaultTool) => {
    if (['cmake', 'xmake'].includes(tool.toLowerCase())) {
      return tool.toLowerCase();
    }
    return defaultTool;
  }, 'auto')
  .action(wrapAction((cmd) => {
    build({ tool: cmd.tool, mode: cmd.mode });
  }));

program
  .command('run')
  .description('run project')
  .action(wrapAction(run));

program.version(version).parse(process.argv);
