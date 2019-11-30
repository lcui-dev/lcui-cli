const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const OUTPUT_DIR = 'src/lib'
const TEMPLATE_DIR = path.resolve(__dirname, 'templates')
const TEMPLATE_FILE_C = path.join(TEMPLATE_DIR, 'router.c')
const TEMPLATE_FILE_H = path.join(TEMPLATE_DIR, 'router.h')

function addInclude(lines, file) {
  let insertIndex = 0

  lines.some((line, i) => {
    if (line.startsWith('#include')) {
      insertIndex = i + 1
      if (line.includes(file)) {
        insertIndex = -1
        return true
      }
    }
    return false
  })
  if (insertIndex >= 0) {
    lines.splice(insertIndex, 0, `#include ${file}`)
    return true
  }
  return false
}

function addComponent(lines, funcName) {
  let funcIndex = -1
  let insertIndex = 0
  let brackets = 0

  lines.some((line, i) => {
    if (line.includes('{')) {
      brackets++
    }
    if (line.includes('}')) {
      brackets--
      if (funcIndex > 0 && brackets === 0) {
        insertIndex = i
        return true
      }
    }
    if (line.includes('UI_InitComponents')) {
      funcIndex = i
      insertIndex = funcIndex + 2
    } else if (line.includes(funcName)) {
      insertIndex = -1
      return true
    }
    return false
  })
  if (insertIndex >= 0) {
    lines.splice(insertIndex, 0, `\t${funcName}();`)
    return true
  }
  return false
}

class ConfigCompiler {
  constructor() {
    this.routeCount = 0
    this.routesMap = {}
    this.routes = []
  }

  allocRouteId(route) {
    let name = route.name || route.components.default

    ++this.routeCount
    name = `route_${name.replace(/-/g, '_')}`
    if (name in this.routes) {
      name = `${name}_${this.routeCount}`
    }
    this.routes.push(name)
    return name
  }

  parseConfig(config, parent = 'NULL') {
    const lines = []
    const s = (str) => typeof str === 'string' ? JSON.stringify(str) : 'NULL'

    config.map((item) => {
      const route = {
        name: item.name,
        path: item.path,
        components: item.components || { default: item.component },
        children: item.children instanceof Array ? item.children : []
      }

      lines.push('config = router_config_create()')
      if (route.name) {
        lines.push( `router_config_set_name(config, ${s(route.name)})`)
      }
      lines.push(
        `router_config_set_path(config, ${s(route.path)})`,
        ...Object.keys(route.components).map((key) => {
          const keyStr = key === 'default' ? null : key
          return `router_config_set_component(config, ${s(keyStr)}, ${s(route.components[key])})`
        })
      )
      if (route.children.length > 0) {
        const id = this.allocRouteId(route)

        lines.push(
          `${id} = router_add_route_record(router, config, ${parent})`,
          'router_config_destroy(config)',
          '',
          ...this.parseConfig(route.children, id)
        )
      } else {
        lines.push(
          `router_add_route_record(router, config, ${parent})`,
          'router_config_destroy(config)',
          ''
        )
      }
    })
    return lines
  }

  compile(input) {
    return [
      `router_config_t *config`,
      ...this.routes.map(id => `router_route_t *${id}`),
      '',
      ...this.parseConfig(input)
    ].map(line => !line ? line : `\t${line};`).join('\n')
  }
}

class Compiler {
  constructor({ cwd } = {}) {
    this.name = 'router'
    this.cwd = cwd
  }

  updateComponentsSourceFile() {
    const file = path.join(this.cwd, 'src', 'ui', 'components.c')
    const lines = fs.readFileSync(file, { encoding: 'utf-8' }).split('\n')

    this.logger.log('update', file)
    addInclude(lines, '<LCUI.h>')
    addInclude(lines, '<lcui-router.h>')
    addInclude(lines, '<lcui-router-link.h>')
    addInclude(lines, '<lcui-router-view.h>')
    addComponent(lines, 'UI_InitRouterLink')
    addComponent(lines, 'UI_InitRouterView')
    fs.writeFileSync(file, lines.join('\n'), { encoding: 'utf-8' })
  }

  compile(input) {
    const mainCode = []
    const configCode = []
    const config = require(input)
    const output = path.join(this.cwd, OUTPUT_DIR, this.name)

    console.log(chalk.green('output'), path.relative(this.cwd, `${output}.c`))
    if (config instanceof Array) {
      config = { default: config }
    }
    Object.keys(config).forEach((key, i) => {
      const funcName = `router_add_${key}_config`

      if (i > 0) {
        mainCode.pop()
      }
      mainCode.push(
        `\t${i > 0 ? '} else ': ''}if (strcmp(config_name, "${key}") == 0) {`,
        `\t\t${funcName}(router);`,
        '\t}'
      )
      configCode.push(
        `static void ${funcName}(router_t *router)`,
        '{',
        new ConfigCompiler().compile(config[key]),
        '}',
        ''
      )
    })
    this.logger.log('output', `${output}.c`)
    fs.writeFileSync(
      `${output}.c`,
      fs.readFileSync(TEMPLATE_FILE_C, { encoding: 'utf-8' })
        .replace('{{config}}', configCode.join('\n'))
        .replace('{{code}}', mainCode.join('\n'))
    )
    console.log(chalk.green('output'), path.relative(this.cwd, `${output}.h`))
    fs.copyFileSync(TEMPLATE_FILE_H, `${output}.h`)
    this.updateComponentsSourceFile()
  }
}

module.exports = Compiler
