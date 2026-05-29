import chalk from "chalk";

export function error(...args: unknown[]) {
  console.error(chalk.red("ERROR:"), ...args);
}

export function log(...args: unknown[]) {
  console.log(...args);
}

export function warning(...args: unknown[]) {
  console.log(chalk.yellow("WARNING:"), ...args);
}
