const path = require('path')
const Generator = require('../generators/i18n')

function compile(input, output) {
  const info = path.parse(input)

  input = path.resolve(process.cwd(), input)
  if (!output) {
    output = path.join(info.dir, `${info.name}`)
  }
  output = path.resolve(process.cwd(), output)
  new Generator(info.name, { cwd: process.cwd(), input, output }).generate()
}

module.exports = {
  compile
}
