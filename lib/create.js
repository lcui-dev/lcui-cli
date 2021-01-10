const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const filesize = require('filesize');
const request = require('request');
const progress = require('request-progress');
const decompress = require('decompress');
const { execSync } = require('child_process');
const cliProgress = require('cli-progress');
const simplegit = require('simple-git/promise');

const TEMPLATE_REPO_URL = 'https://codeload.github.com/lc-ui/lcui-quick-start/zip/master';
const TEMPLATE_REPO_NAME = 'lcui-quick-start';

function updateJSONFile(file, callback) {
  const data = JSON.parse(fs.readFileSync(file), 'utf-8');
  fs.writeFileSync(file, JSON.stringify(callback(data), null, 2), 'utf-8');
}

function download() {
  let started = false;
  let fileSize = 0;
  const url = TEMPLATE_REPO_URL;
  const filePath = `${TEMPLATE_REPO_NAME}.zip`;
  const tmpFilePath = `${filePath}.download`;
  const bar = new cliProgress.Bar({
    format: '[{bar}] {percentage}% | {value}/{total} | {speed}/s'
  }, cliProgress.Presets.shades_classic);

  if (fs.existsSync(filePath)) {
    return Promise.resolve(filePath);
  }
  console.log('Downloading template project package');
  return new Promise((resolve, reject) => {
    progress(request(url))
      .on('progress', (state) => {
        if (!started) {
          fileSize = state.size.total;
          bar.start(state.size.total || '-', state.size.transferred);
          started = true;
        }
        bar.update(state.size.transferred, {
          speed: filesize(state.speed || 0)
        });
      })
      .on('error', reject)
      .on('end', () => {
        bar.update(fileSize);
        bar.stop();
        fs.renameSync(tmpFilePath, filePath);
        resolve(filePath);
      })
      .pipe(fs.createWriteStream(tmpFilePath));
  });
}

class Creator {
  constructor(name) {
    this.name = name;
    this.dir = path.resolve(name);
  }

  async setup() {
    updateJSONFile(path.join(this.dir, 'lcpkg.json'), (data) => ({
      ...data,
      name: this.name,
      version: '0.1.0',
      private: true
    }));
    updateJSONFile(path.join(this.dir, 'package.json'), (data) => ({
      ...data,
      name: this.name,
      version: '0.1.0'
    }));

    const git = simplegit(this.dir);

    try {
      console.log('Setup git repository');
      await git.init();
      await git.add('.');
      await git.commit('Initial commit\n\ninitialize project with lcui-quick-start');
    } catch (err) {
      console.log('Skipped git commit due to missing username and email in git config.');
      console.log('You will need to perform the initial commit yourself.');
    }
    console.log('Install dependencies');
    execSync('npm install --silent', { cwd: this.dir, stdio: 'inherit' });
    console.log(`Successfully created project ${chalk.yellow(this.name)}.`);
    console.log('Get started with the following commands:\n');
    if (this.dir !== process.cwd()) {
      console.log(chalk.cyan(` ${chalk.gray('$')} cd ${this.name}`));
    }
    console.log(chalk.cyan(` ${chalk.gray('$')} lcpkg install`));
    console.log(chalk.cyan(` ${chalk.gray('$')} lcpkg run start\n`));
  }

  async run() {
    if (fs.existsSync(this.dir)) {
      throw new Error('The project directory already exists');
    }
    fs.mkdirSync(this.dir);

    const zipFile = await download();
    const prefix = `${TEMPLATE_REPO_NAME}-master/`;

    console.log(zipFile, this.dir);
    await decompress(zipFile, this.dir, {
      map: (file) => ({
        ...file,
        path: file.path.substr(prefix.length)
      })
    });
    await this.setup();
  }
}

function create(name) {
  return new Creator(name).run();
}

module.exports = {
  create
};
