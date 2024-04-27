import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { CompilerInstance } from "../types.js";

export function runXMake({ logger, options }: CompilerInstance) {
  const configFile = path.join(options.rootContext, "xmake.lua");
  if (!fs.existsSync(configFile)) {
    return;
  }
  logger.info('Run xmake to build the project...')
  spawnSync("xmake", ["-y"], { cwd: options.rootContext, stdio: "inherit" });
}
