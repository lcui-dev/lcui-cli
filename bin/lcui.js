#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import program from "commander";
import { fileURLToPath } from "url";
import { create } from "../lib/create.js";
import { generate } from "../lib/generator.js";
import { compile } from "../lib/compiler.js";

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

program
  .command("create <project-name>")
  .description("create a new LCUI project")
  .action(wrapAction(create));

program
  .command("generate <type> [name]")
  .description("generate files with template of specified type")
  .action(wrapAction(generate));

program
  .command("compile <type>")
  .description("compile files of the specified type to C code")
  .action(wrapAction(compile));

program.version(version).parse(process.argv);
