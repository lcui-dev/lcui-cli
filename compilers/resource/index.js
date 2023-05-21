const fs = require("fs");
const path = require("path");
const { FileOperateLogger } = require("../../lib/utils");
const { compileJavaScriptFile } = require("./javascript");
const { compileJsonFile } = require("./json");
const { compileXmlFile } = require("./xml");
const { compileYamlFile } = require("./yaml");

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
        this.logger.log('output', `${filePath}.h`);
        fs.writeFileSync(`${filePath}.h`, content);
      });
    };

    compileFiles(this.sourceDir);
  }
}

module.exports = ResourceCompiler;
