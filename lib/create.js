const fs = require('fs-extra')
const path = require('path')
const chalk = require('chalk')
const filesize = require('filesize')
const request = require('request')
const progress = require('request-progress')
const decompress = require('decompress')
const { execSync } = require('child_process')
const _cliProgress = require('cli-progress')
const simplegit = require('simple-git/promise')

const TEMPLATE_REPO_URL = 'https://codeload.github.com/lc-ui/lcui-quick-start/zip/master'
const TEMPLATE_REPO_NAME = 'lcui-quick-start'

function updateJSONFile(file, callback) {
  fs.writeFileSync(file, JSON.stringify(callback(require(file)), null, 2), { encoding: 'utf-8' })
}

class Creator {
  constructor(name) {
    this.name = name
    this.dir = path.resolve(name)
  }

  download() {
    let started = false
    const url = TEMPLATE_REPO_URL
    const filePath = `${TEMPLATE_REPO_NAME}.zip`
    const tmpFilePath = `${filePath}.download`
    const bar = new _cliProgress.Bar({
      format: '[{bar}] {percentage}% | {value}/{total} | {speed}/s'
    }, _cliProgress.Presets.shades_classic)

    if (fs.existsSync(filePath)) {
      return Promise.resolve(filePath)
    }
    console.log(`downloading template project package`)
    return new Promise((resolve, reject) => {
      progress(request(url))
        .on('progress', (state) => {
          if (!started) {
            bar.start(state.size.total || '-', state.size.transferred)
            started = true
          }
          bar.update(state.size.transferred, {
            speed: filesize(state.speed || 0)
          })
        })
        .on('error', reject)
        .on('end', () => {
          bar.stop()
          fs.renameSync(tmpFilePath, filePath)
          resolve(filePath)
        })
        .pipe(fs.createWriteStream(tmpFilePath))
    })
  }

  async setup() {
    updateJSONFile(path.join(this.dir, 'lcpkg.json'), (data) => {
      data.name = this.name
      data.version = '0.1.0'
      data.private = true
      return data
    })
    updateJSONFile(path.join(this.dir, 'package.json'), (data) => {
      data.name = this.name
      data.version = '0.1.0'
      return data
    })

    const git = simplegit(this.dir)

    try {
      console.log('Setup git repository')
      await git.init()
      await git.add('.')
      await git.commit('Initial commit\n\ninitialize project with lcui-quick-start')
    } catch (err) {
      console.log('Skipped git commit due to missing username and email in git config.')
      console.log('You will need to perform the initial commit yourself.')
    }
    console.log('Install dependencies')
    execSync('npm install --silent', { cwd: this.dir, stdio: 'inherit' })
    console.log('')
    console.log(`Successfully created project ${chalk.yellow(this.name)}.`)
    console.log(`Get started with the following commands:\n`)
    if (this.dir !== process.cwd()) {
      console.log(chalk.cyan(` ${chalk.gray('$')} cd ${this.name}`))
    }
    console.log(chalk.cyan(` ${chalk.gray('$')} npm run start\n`))
  }

  async run() {
    if (fs.existsSync(this.dir)) {
      throw new Error('The project directory already exists')
    }
    fs.mkdirSync(this.dir)

    const file = await this.download()
    const prefix = `${TEMPLATE_REPO_NAME}-master/`

    await decompress(file, this.dir, {
      map: (file) => {
        file.path = file.path.substr(prefix.length)
        return file
      }
    })
    await this.setup()
  }
}

async function create(name) {
  try {
    await new Creator(name).run()
  } catch (err) {
    console.error(err.message)
    process.exit(err.code)
  }
}

module.exports = {
  create
}
