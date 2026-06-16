import path from "path";
import fs from "fs-extra";
import { CompilerOptions, ComponentConfig } from "../types.js";
import { writeIfChanged } from "../compiler/fs-cache.js";

export class AppComponentsCompiler {
  components: Record<string, ComponentConfig>;
  options: CompilerOptions;
  dataFile: string;

  constructor(
    options: CompilerOptions,
    private mainHeaderFile: string
  ) {
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
    // 内容相同则不写盘，避免抖动 mtime 触发外部观察者（如 xmake）误以为有改动。
    writeIfChanged(this.dataFile, JSON.stringify(this.components, null, 2) + "\n");
  }

  clearCache() {
    fs.removeSync(this.dataFile);
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
        ...componentList.flatMap((c) => c.components.map((name) => `ui_register_${name}();`)),
      ],
    };
  }
}
