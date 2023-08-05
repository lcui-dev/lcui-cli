#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import { Command } from "commander";
import { fileURLToPath } from "url";
import { create } from "../lib/create.js";
import { generate } from "../lib/generator.js";
import { compile } from "../lib/compiler/index.js";

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
  .description("create a new LCUI project")
  .action(wrapAction(create));

program
  .command("generate <type> [name]")
  .description("generate files with template of specified type")
  .action(wrapAction(generate));

program
  .command("compile")
  .description("compile resource files into C soruce files")
  .argument("<filePath>", "file or directory")
  .option(
    "--type <name>",
    "specify which type of compiler to use to compile files",
    "auto"
  )
  .action(wrapAction(compile));

program.version(version).parse(process.argv);
