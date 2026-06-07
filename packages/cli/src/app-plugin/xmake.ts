import path from "path";
import fs from "fs-extra";
import { spawnSync } from "child_process";
import { CompilerInstance } from "../types.js";

export function runXMake({ logger, options, changedOutputs }: CompilerInstance) {
  const configFile = path.join(options.rootContext, "xmake.lua");
  if (!fs.existsSync(configFile)) {
    return;
  }
  if (options.skipXMake) {
    logger.info("Skip xmake (--skip-xmake).");
    return;
  }
  if (changedOutputs.size === 0) {
    logger.info("No outputs changed, skip xmake.");
    return;
  }
  logger.info("Run xmake to build the project...");
  spawnSync("xmake", ["-y", "-P", "."], { cwd: options.rootContext, stdio: "inherit" });
}
