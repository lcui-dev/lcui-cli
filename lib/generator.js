const fs = require('fs')
const path = require('path')

function generate(type, name) {
  const file = path.join(__dirname, '../generators', type, 'index.js')

  if (!fs.existsSync(file)) {
    throw new Error(`generator not found: ${type}`)
  }

  const Generator = require(file)

  return new Generator(name, { cwd: process.cwd() }).generate()
}

module.exports = {
  generate
}
