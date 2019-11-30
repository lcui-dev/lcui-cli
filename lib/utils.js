const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

class FileOperateLogger {
  constructor(cwd) {
    this.cwd = cwd
  }

  log(type, file) {
    let text = type

    if (type === 'update') {
      text = chalk.yellow(type)
    } else if (['create', 'output'].includes(type)) {
      text = chalk.green(type)
    }
    console.log(text, path.relative(this.cwd, file))
  }
}

function flat(obj) {
  const props = {}

  function flatProps(o, prefix) {
    Object.keys(o).forEach((k) => {
      const key = prefix ? `${prefix}.${k}` : k

      if (typeof o[k] === 'object') {
        flat(o[k], key)
      } else {
        props[key] = o[k]
      }
    })
  }

  flatProps(obj)
  return props
}

function format(template, data) {
  let output = template
  const props = flat(data)
  const keys = Object.keys(props)
  const regs = keys.map(k => new RegExp(`{{${k}}}`, 'g'))

  regs.forEach((reg, i) => {
    output = output.replace(reg, props[keys[i]])
  })
  return output
}

function generateFile(templateFile, outFile, data = {}) {
  const content = fs.readFileSync(templateFile, { encoding: 'utf-8' })
  fs.writeFileSync(outFile, format(content, data), { encoding: 'utf-8' })
}

module.exports = {
  flat,
  format,
  generateFile,
  FileOperateLogger
}
