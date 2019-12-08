const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const camelcase = require('camelcase')
const decamelize = require('decamelize')
const { format } = require('../../lib/utils')

class Generator {
  constructor(name, options) {
    this.data = {
      className: camelcase(name, { pascalCase: true }),
      variableName: decamelize(name),
      fileName: decamelize(name, '-'),
      cssName: decamelize(name, '-'),
      tagName: decamelize(name, '-')
    }
    this.cwd = options.cwd
    this.sourceDir = path.join(this.cwd, 'src/ui')
    this.styleDir = path.join(this.cwd, 'src/ui/stylesheets')
    this.componetsDir = path.join(this.sourceDir, 'components')
    this.componetsStyleDir = path.join(this.styleDir, 'components')
    this.templatesDir = path.join(__dirname, 'templates')
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`${this.sourceDir} is not exists!`)
    }
  }

  updateComponentsSourceFile() {
    let indexOfMain = -1
    let lastIndexOfInclude = -1
    let lastIndexOfFunction = -1
    const file = path.join(this.sourceDir, 'components.c')
    const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n')
    const includeCode = `#include "components/${this.data.fileName}.h"`
    const initFunciontCode = `\tUI_Init${this.data.className}();`

    lines.forEach((line, index) => {
      if (line.includes('#include')) {
        lastIndexOfInclude = index
      } else if (line.includes('UI_InitComponents')) {
        indexOfMain =index
      } else if (line.includes('UI_Init')) {
        lastIndexOfFunction = index
      }
    })
    if (indexOfMain === -1 || lastIndexOfFunction <= 0) {
      throw new Error('cannot update UI_InitComponents() function body.')
    }
    lines.splice(lastIndexOfFunction + 1, 0, initFunciontCode)
    lines.splice(lastIndexOfInclude + 1, 0, includeCode)
    console.log(chalk.yellow('update'), path.relative(this.cwd, file))
    return fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf-8' })
  }

  updateComponentStyleFile() {
    const line = `@import "components/${this.data.cssName}";`
    const file = path.join(this.styleDir, '_components.scss')
    const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n')

    if (lines.length > 0 && !lines[lines.length - 1].trim()) {
      lines.splice(lines.length - 1, 0, line)
    } else {
      lines.push(line, '')
    }
    console.log(chalk.yellow('update'), path.relative(this.cwd, file))
    return fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf-8' })
  }

  generateFile(input, output) {
    const templateFile = path.join(this.templatesDir, input)
    const content = fs.readFileSync(templateFile, { encoding: 'utf-8' })

    console.log(chalk.green('create'), path.relative(this.cwd, output))
    return fs.writeFileSync(output, format(content, this.data))
  }

  generate() {
    const name = this.data.fileName
    const sourceFile = path.join(this.componetsDir, `${name}.c`)
    const headerFile = path.join(this.componetsDir, `${name}.h`)
    const styleFile = path.join(this.componetsStyleDir, `_${name}.scss`)

    this.generateFile('widget.c', sourceFile)
    this.generateFile('widget.h', headerFile)
    this.generateFile('widget.scss', styleFile)

    this.updateComponentsSourceFile()
    this.updateComponentStyleFile()
  }
}

module.exports = Generator
