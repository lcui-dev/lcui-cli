#!/usr/bin/env node

const program = require('commander')
const { create } = require('../lib/create')
const { generate } = require('../lib/generator')
const { compile } = require('../lib/compiler')
const { version } = require('../package.json')

program
  .command('create <project-name>')
  .description('create a new LCUI project')
  .action(create)

program
  .command('generate <type> <name>')
  .description('generate files with template of specified type')
  .action(generate)

program
  .command('compile <type>')
  .description('compile config file of the specified type to C code')
  .action(compile)

program.version(version).parse(process.argv)
