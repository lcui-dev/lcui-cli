import fs from "fs-extra";
import path from "path";

export default class UIPlugin {
  constructor() {
    this.name = "UIPlugin";
  }

  /**
   * @param {CompilerInstance} compiler
   */
  apply(compiler) {
    const dataFile = path.join(
      compiler.options.buildDirPath,
      "components.json"
    );
    let components = {};
    if (fs.existsSync(dataFile)) {
      components = fs.readJSONSync(dataFile);
      if (typeof components !== "object" || !components) {
        components = {};
      }
    }
    compiler.hooks.loadModule.tap(this.name, (file, data) => {
      if (data.components) {
        components = { ...components, ...data.components };
      }
    });
    compiler.hooks.done.tap(this.name, () => {
      fs.writeJSONSync(dataFile, components, { spaces: 2 });
    });
  }
}
