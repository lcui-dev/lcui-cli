const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { pascalCase } = require('pascal-case')
const { format } = require('../../lib/utils')

const sourceFileExt = ['.c', 'cpp']
const cmakeFile = 'CMakeLists.txt'
const xmakeFile = 'xmake.lua'

class Generator {
  constructor(name, options) {
    this.name = name
    this.cwd = options.cwd
    this.templatesDir = path.join(__dirname, 'templates')
    this.sourceDir = path.join(this.cwd, 'src')
  }

  writeFile(file, content) {
    console.log(chalk.green('writing'), path.relative(this.cwd, file))
    return fs.writeFileSync(file, content)
  }

  readTemplateFile(name) {
    const templateFile = path.join(this.templatesDir, name)
    return fs.readFileSync(templateFile, { encoding: 'utf-8' })
  }

  generateFile(input, output) {
    this.writeFile(output, this.readTemplateFile(input))
  }

  generateCMakeFileForDirectory(dir, moduleNames, addSource = true) {
    let dirs = []
    const files = []
    const dirPath = path.resolve(this.cwd, dir)

    const id = dir.replace(/src[\\\/]/, '')
    const moduleName = `App${pascalCase(id)}`
    const varName = `DIR_${id.replace(/[^a-zA-Z]/g, '_').toUpperCase()}_SRC`

    fs.readdirSync(dirPath).forEach((name) => {
      if (fs.statSync(path.join(dirPath, name)).isDirectory()) {
        dirs.push(name)
      } else if (sourceFileExt.includes(path.parse(name).ext)) {
        files.push(name)
      }
    })

    let total = files.length

    if (dirs.length < 1 && total < 1) {
      return 0
    }

    dirs = dirs.filter((subDir) => {
      const count = this.generateCMakeFileForDirectory(path.join(dir, subDir), moduleNames)
      total += count
      return count > 0
    })

    if (total > 0) {
      const lines = dirs.map((name) => `add_subdirectory(${name})`)

      if (addSource && files.length > 0) {
        lines.push(`aux_source_directory(. ${varName})`)
        lines.push(`add_library(${moduleName} \${${varName}})`)
      }
      if (dir !== 'src') {
        moduleNames.push(moduleName)
      }
      this.writeFile(path.join(dirPath, cmakeFile), `${lines.join('\n')}\n`)
    }
    return total
  }

  generateCMakeFiles() {
    const modules = []
    const file = `${cmakeFile}.in`

    if (!fs.existsSync(this.sourceDir)) {
      console.log(chalk.yellow('warning:'), '\'src\' directory does not exist')
      return
    }

    this.generateCMakeFileForDirectory('src', modules, false)
    this.writeFile(
      path.resolve(this.cwd, file),
      format(
        this.readTemplateFile(file),
        { modules: modules.map((name) => `    ${name}`).join('\n') },
        ['\\[\\[', '\\]\\]']
      )
    )
  }

  generateXMakeFiles() {
    const file = `${xmakeFile}.in`
    this.generateFile(file, path.resolve(this.cwd, file))
  }

  generate() {
    if (this.name === 'xmake') {
      this.generateXMakeFiles()
    } else {
      this.generateCMakeFiles()
    }
  }
}

module.exports = Generator
