const fs = require('fs-extra');
const stream = require('stream');
const { promisify } = require('util');
const path = require('path');
const chalk = require('chalk');
const got = import('got');
const decompress = require('decompress');
const cliProgress = require('cli-progress');
const simplegit = require('simple-git');

const TEMPLATE_REPO_URL = 'https://codeload.github.com/lc-ui/lcui-quick-start/zip/master';
const TEMPLATE_REPO_NAME = 'lcui-quick-start';

function updateJSONFile(file, callback) {
  const data = JSON.parse(fs.readFileSync(file), 'utf-8');
  fs.writeFileSync(file, JSON.stringify(callback(data), null, 2), 'utf-8');
}

async function download() {
  const pipeline = promisify(stream.pipeline);
  const url = TEMPLATE_REPO_URL;
  const filePath = `${TEMPLATE_REPO_NAME}.zip`;
  const tmpFilePath = `${filePath}.download`;
  const bar = new cliProgress.Bar({
    format: '[{bar}] {percentage}% | {value}/{total}'
  }, cliProgress.Presets.shades_classic);

  if (fs.existsSync(filePath)) {
    return Promise.resolve(filePath);
  }
  console.log('Downloading template project package');
  bar.start('-', 0);
  await pipeline(
    got.stream(url)
      .on('downloadProgress', (progress) => {
        bar.update(progress.transferred);
        if (progress.total) {
          bar.setTotal(progress.total);
        }
      }),
    fs.createWriteStream(tmpFilePath)
  );
  bar.stop();
  fs.renameSync(tmpFilePath, filePath);
  return filePath;
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
    console.log(`Successfully created project ${chalk.yellow(this.name)}.`);
    console.log('Get started with the following commands:\n');
    if (this.dir !== process.cwd()) {
      console.log(chalk.cyan(` ${chalk.gray('$')} cd ${this.name}`));
    }
    console.log(chalk.cyan(` ${chalk.gray('$')} lcui setup`));
    console.log(chalk.cyan(` ${chalk.gray('$')} lcui build`));
    console.log(chalk.cyan(` ${chalk.gray('$')} lcui run\n`));
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
