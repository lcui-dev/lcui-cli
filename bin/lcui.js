#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import { fileURLToPath } from "url";
import { create } from "../lib/create.js";
import compile from "../lib/compiler/index.js";

const { version } = fs.readJSONSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../package.json")
);

function wrapAction(action) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (err) {
      console.error(err);
      process.exit(err.code);
    }
  };
}

const program = new Command();

program
  .command("create <project-name>")
  .description("Create a new LCUI project")
  .action(wrapAction(create));

program
  .command("compile")
  .description("Compile resource files into C source files")
  .argument("[filePath]", "File or directory")
  .option("--verbose", "More detailed log output")
  .action(wrapAction(compile));

program.version(version).parse(process.argv);
