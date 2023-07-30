import chalk from "chalk";

export function error(...args) {
  console.error(chalk.red("ERROR:"), ...args);
}

export function log(...args) {
  console.log(...args);
}

export function warning(...args) {
  console.log(chalk.yellow("WARNING:"), ...args);
}
