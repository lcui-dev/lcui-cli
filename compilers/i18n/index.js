const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { flat } = require('../../lib/utils')

const TEMPLATE_DIR = path.resolve(__dirname, 'templates')
const TEMPLATE_FILE_C = path.join(TEMPLATE_DIR, 'i18n.c')
const TEMPLATE_FILE_H = path.join(TEMPLATE_DIR, 'i18n.h')

function convertToC(arr, indent = 0) {
  const body = []

  arr.forEach((item, i) => {
    if (item instanceof Array) {
      body.push(...convertToC(item, indent + 1))
    } else {
      item = item === null ? 'NULL' : `L${JSON.stringify(item)}`
      body.push(`${'\t'.repeat(indent + 1)}${item}`)
      if (i < arr.length - 1) {
      }
    }
    if (i < arr.length - 1) {
      body.push(`${body.pop()},`)
    }
  })
  return [`${'\t'.repeat(indent)}{`, ...body, `${'\t'.repeat(indent)}}`]
}

class Compiler {
  constructor({ cwd } = {}) {
    this.cwd = cwd
    this.name = 'i18n'
  }

  compile(input) {
    const locales = require(input)
    const localeKeys = Object.keys(locales)
    const sourceDir = path.join(this.cwd, 'src', 'lib')
    const output = path.join(sourceDir, this.name)

    let maxItems = 1
    let content = convertToC(
      localeKeys.map((key) => {
        const result = [key]
        const props = flat(locales[key])

        Object.keys(props).forEach((p) => {
          result.push(p, props[p])
        })
        result.push(null)
        if (result.length > 0) {
          maxItems = result.length
        }
        return result
      })
    )
    .map((line) => {
      let i = line.length - 1
      if (line[i] === '[') {
        return line.substr(0, line.length - 1) + '{'
      }
      if (line[i] === ']') {
        return line.substr(0, line.length - 1) + '}'
      }
      if (line[i] === ',' && line[i - 1] === ']') {
        return line.substr(0, line.length - 2) + '},'
      }
      return line
    })
    .join('\n')

    if (!fs.existsSync(sourceDir)) {
      throw new Error(`${sourceDir} is not exists!`)
    }
    console.log(chalk.green('output'), path.relative(this.cwd, `${output}.c`))
    fs.writeFileSync(
      `${output}.c`,
      fs.readFileSync(TEMPLATE_FILE_C, { encoding: 'utf-8' })
        .replace('{{len}}', localeKeys.length)
        .replace('{{content}}', content)
        .replace('{{maxItems}}', maxItems)
        .replace('{{fileName}}', this.name),
      { encoding: 'utf-8' }
    )
    console.log(chalk.green('output'), path.relative(this.cwd, `${output}.h`))
    fs.copyFileSync(TEMPLATE_FILE_H, `${output}.h`)
  }
}

module.exports = Compiler
