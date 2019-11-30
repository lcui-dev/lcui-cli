const fs = require('fs')
const path = require('path')

function compile(type) {
  const cwd = process.cwd()
  const input = path.resolve(cwd, 'config', `${type}.js`)
  const dep = path.join(__dirname, '../compilers', type, 'index.js')

  if (!fs.existsSync(dep)) {
    throw new Error(`compiler not found: ${type}`)
  }
  if (!fs.existsSync(input)) {
    throw new Error(`compiler config file not found: ${input}`)
  }

  const Compiler = require(dep)

  return new Compiler({ cwd }).compile(input)
}

module.exports = {
  compile
}
