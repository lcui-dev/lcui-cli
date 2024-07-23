import path from "path";
import fs from "fs-extra";
import { CompilerOptions, ComponentConfig } from "../types.js";

export class AppComponentsCompiler {
  components: Record<string, ComponentConfig>;
  options: CompilerOptions;
  dataFile: string;

  constructor(options: CompilerOptions, private mainHeaderFile: string) {
    this.components = {};
    this.options = options;
    this.dataFile = path.join(options.buildDir, "components.json");
  }

  loadCache() {
    if (fs.existsSync(this.dataFile)) {
      this.components = fs.readJSONSync(this.dataFile);
      if (typeof this.components !== "object" || !this.components) {
        this.components = {};
      }
    }
  }

  saveCache() {
    fs.writeJSONSync(this.dataFile, this.components, { spaces: 2 });
  }

  merge(components: Record<string, ComponentConfig>) {
    this.components = { ...this.components, ...components };
  }

  compile() {
    const componentList = Object.keys(this.components)
      .sort()
      .map((key) => this.components[key]);

    return {
      includeCode: componentList.map(
        (c) =>
          `#include "${path.relative(
            path.dirname(this.mainHeaderFile),
            path.join(this.options.rootContext, c.headerFilePath)
          )}"`
      ),
      initCode: [
        ...componentList
          .filter((c) => c.resourceLoaderName)
          .map((c) => `${c.resourceLoaderName}();`),
        ...componentList.map((c) =>
          c.components.map((name) => `ui_register_${name}();`)
        ),
      ],
    };
  }
}
