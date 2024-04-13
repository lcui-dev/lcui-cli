import fs from "fs-extra";
import path from "path";

const mainFileContent = `#include "main.h"

int main(int argc, char *argv[])
{
        lcui_app_init();

        // Write code here to initialize your application,
        // such as loading configuration files, initializing functional modules
        // ...

        return lcui_app_run();
}
`;

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
    /** @type {Record<string, ComponentConfig>} */
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
      const sourceDir = path.join(compiler.options.rootContext, "src");
      const mainHeaderFile = path.join(sourceDir, "main.h");
      const mainSourceFile = path.join(sourceDir, "main.c");
      const componentList = Object.keys(components)
        .sort()
        .map((key) => components[key]);

      fs.writeJSONSync(dataFile, components, { spaces: 2 });
      if (!fs.existsSync(sourceDir)) {
        fs.mkdirpSync(sourceDir);
      }
      if (!fs.existsSync(mainSourceFile)) {
        fs.writeFileSync(mainSourceFile, mainFileContent);
      }
      fs.writeFileSync(
        mainHeaderFile,
        `#include <LCUI.h>
#include <LCUI/main.h>

${componentList.map(
  (c) =>
    `#include "${path.relative(
      sourceDir,
      path.join(compiler.options.rootContext, c.headerFilePath)
    )}"`
)}

static void lcui_app_init(void)
{
        lcui_init();
${componentList
  .filter((c) => c.resourceLoaderName)
  .map((c) => `        ${c.resourceLoaderName}();`)}
${componentList.map((c) =>
  c.components.map((name) => `        ui_register_${name}();`)
)}
}

static int lcui_app_run(void)
{
        return lcui_run();
}

`
      );
    });
  }
}
