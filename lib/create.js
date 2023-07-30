import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simplegit from "simple-git";
import { osLocaleSync } from "os-locale";

const locales = {
  cn: {
    libRepo: "https://gitee.com/lc-soft/LCUI.git",
    templateRepo: "https://gitee.com/lcui-dev/lcui-quick-start.git",
    message: {
      project_exists: "项目目录早已存在",
      project_download: (url) => `正在下载项目模板：${url}`,
      project_setup: '正在准备项目文件',
      project_created: (name) => `已成功创建项目 ${name}`,
      get_started: "使用以下命令开始体验：",
      initial_commit: (url) => `初始化项目\n\n使用项目模板 ${url} 初始化`,
      commit_skiped: '由于 git 配置中缺少用户名和电子邮件，已跳过 git commit 命令。\n你需要自己执行初始提交。'
    },
  },
  en: {
    libRepo: "https://gitee.com/lc-soft/LCUI.git",
    templateRepo: "https://gitub.com/lcui-dev/lcui-quick-start.git",
    message: {
      project_exists: "The project directory already exists",
      project_download: (url) => `Downloading project template: ${url}`,
      project_setup: 'Preparing project files',
      project_created: (name) => `Successfully created project ${name}`,
      get_started: "Get started with the following commands:",
      initial_commit: (url) =>
        `Initial commit\n\nInitialize project with ${url}`,
      commit_skiped: 'Skipped git commit due to missing username and email in git config.\nYou will need to perform the initial commit yourself.'
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
      throw new Error(env.message.project_exists);
    }
    console.log(msg.project_download(env.templateRepo));
    await simplegit().clone(env.templateRepo, this.dir, { '--depth': 1 });
    console.log(msg.project_setup);
    const git = simplegit(this.dir);
    await git
      .branch({ "-m": true }, "old")
      .checkout({ "--orphan": true }, "master")
      .branch({ "-D": true },  "old")
      .submoduleUpdate({ "--init": true, "--recursive": true });

    try {
      await git.add(".").commit(msg.initial_commit(env.templateRepo));
    } catch (err) {
      console.log(msg.commit_skiped);
    }
    console.log(env.message.project_created(chalk.yellow(this.name)));
    console.log(`${env.message.get_started}\n`);
    console.log(chalk.cyan(` ${chalk.gray("$")} cd ${this.name}`));
    console.log(chalk.cyan(` ${chalk.gray("$")} xmake`));
    console.log(chalk.cyan(` ${chalk.gray("$")} xmake run\n`));
  }
}

export async function create(name) {
  const locale = await osLocaleSync();
  return new Creator({ name, locale }).run();
}
