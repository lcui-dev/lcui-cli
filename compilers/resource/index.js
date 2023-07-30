import fs from "fs";
import path from "path";
import { FileOperateLogger } from "../../lib/utils.js";
import { compileJavaScriptFile } from "./javascript.js";
import { compileJsonFile } from "./json.js";
import { compileXmlFile } from "./xml.js";
import { compileYamlFile } from "./yaml.js";

class ResourceCompiler {
  constructor({ cwd, sourceDir } = {}) {
    this.cwd = cwd;
    this.name = "resource";
    this.logger = new FileOperateLogger(cwd);
    this.sourceDir = sourceDir || path.join(this.cwd, "src", "ui");
  }
  compile() {
    const compileFiles = (dirPath) => {
      fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          compileFiles(filePath);
          return;
        }
        if (!stat.isFile()) {
          return;
        }
        let content;
        switch (path.parse(file).ext.toLowerCase()) {
          case ".xml":
            content = compileXmlFile(filePath);
            break;
          case ".yml":
          case ".yaml":
            content = compileYamlFile(filePath);
            break;
          case ".js":
            content = compileJavaScriptFile(filePath);
            break;
          case ".json":
            content = compileJsonFile(filePath);
            break;
          default:
            return;
        }
        this.logger.log("output", `${filePath}.h`);
        fs.writeFileSync(`${filePath}.h`, content);
      });
    };
    compileFiles(this.sourceDir);
  }
}

export default ResourceCompiler;
