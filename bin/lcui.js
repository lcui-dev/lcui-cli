#!/usr/bin/env node

const program = require('commander')
const { create } = require('../lib/init')
const { compile } = require('../lib/i18n')
const { generate } = require('../lib/generator')
const { version } = require('../package.json')

program
  .command('create <project>')
  .description('create a new LCUI project')
  .action(create)

program
  .command('generate <type> <name>')
  .description('run a generator')
  .action(generate)

  program
  .command('ci18n <input> [output]')
  .description('compile i18n locale file to C source file')
  .action(compile)

program.version(version).parse(process.argv)
