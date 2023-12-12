import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simplegit from "simple-git";
import { osLocaleSync } from "os-locale";
import { execSync } from "child_process";

const locales = {
  cn: {
    libRepo: "https://gitee.com/lc-soft/LCUI.git",
    templateRepo: "https://gitee.com/lcui-dev/lcui-quick-start.git",
    message: {
      projectExists: "项目目录早已存在",
      downloading: (url) => `正在下载项目模板：${url}`,
      initGitRepo: "正在为项目初始化 Git 仓库",
      installNodeModules: "正在安装依赖项",
      projectCreated: (name) => `已成功创建项目 ${name}`,
      getStarted: "使用以下命令开始体验：",
      initialCommit: (url) => `初始化项目\n\n使用项目模板 ${url} 初始化`,
      commitSkipped:
        "由于 git 配置中缺少用户名和电子邮件，已跳过 git commit 命令。\n你需要自己执行初始提交。",
    },
  },
  en: {
    libRepo: "https://gitee.com/lc-soft/LCUI.git",
    templateRepo: "https://gitub.com/lcui-dev/lcui-quick-start.git",
    message: {
      projectExists: "The project directory already exists",
      downloading: (url) => `Downloading project template: ${url}`,
      initGitRepo: "Initializing git repository",
      installNodeModules: "Installing node modules",
      projectCreated: (name) => `Successfully created project ${name}`,
      getStarted: "Get started with the following commands:",
      initialCommit: (url) =>
        `Initial commit\n\nInitialize project with ${url}`,
      commitSkipped:
        "Skipped git commit due to missing username and email in git config.\nYou will need to perform the initial commit yourself.",
    },
  },
};

class Creator {
  constructor({ name, locale } = {}) {
    this.name = name;
    this.dir = path.resolve(name);
    this.env = locale.startsWith("zh") ? locales.cn : locales.en;
  }

  async run() {
    const env = this.env;
    const msg = env.message;
    if (fs.existsSync(this.dir)) {
      throw new Error(env.message.projectExists);
    }
    console.log(msg.downloading(env.templateRepo));
    await simplegit().clone(env.templateRepo, this.dir, {
      "--depth": 1,
      "--branch": "develop",
    });
    console.log(msg.initGitRepo);
    const git = simplegit(this.dir);
    await git
      .branch({ "-m": true }, "old")
      .checkout({ "--orphan": true }, "master")
      .branch({ "-D": true }, "old")
      .removeRemote("origin")
      .submoduleUpdate({ "--init": true, "--recursive": true });

    try {
      await git.add(".").commit(msg.initialCommit(env.templateRepo));
    } catch (err) {
      console.log(msg.commitSkipped);
    }
    let installed = false;
    try {
      console.log(env.message.installNodeModules);
      try {
        execSync("yarn install", { cwd: this.dir });
      } catch (err) {
        execSync("npm install", { cwd: this.dir });
      }
      installed = true;
    } catch (err) {
      console.error(err);
    }
    console.log(env.message.projectCreated(chalk.yellow(this.name)));
    console.log(`${env.message.getStarted}\n`);
    console.log(chalk.cyan(` ${chalk.gray("$")} cd ${this.name}`));
    if (!installed) {
      console.log(chalk.cyan(` ${chalk.gray("$")} npm install`));
    }
    console.log(chalk.cyan(` ${chalk.gray("$")} lcui compile ./src`));
    console.log(chalk.cyan(` ${chalk.gray("$")} xmake`));
    console.log(chalk.cyan(` ${chalk.gray("$")} xmake run app\n`));
  }
}

export async function create(name) {
  const locale = await osLocaleSync();
  return new Creator({ name, locale }).run();
}
