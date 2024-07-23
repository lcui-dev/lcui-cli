import fs from "fs-extra";
import path from "path";
import { AppComponentsCompiler } from "./components.js";
import { AppRouterCompiler } from "./router.js";
import { CompilerInstance } from "../types.js";
import { runXMake } from "./xmake.js";

export default class AppPlugin {
  name = "AppPlugin";

  apply(compiler: CompilerInstance) {
    const { appDir, sourceDir } = compiler.options;
    const routerCompiler = new AppRouterCompiler(compiler.options);
    const mainHeaderFile = path.join(
      routerCompiler.active ? appDir : sourceDir,
      "main.h"
    );
    const mainSourceFile = path.join(
      routerCompiler.active ? appDir : sourceDir,
      "main.c"
    );
    const componentsCompiler = new AppComponentsCompiler(
      compiler.options,
      mainHeaderFile
    );

    componentsCompiler.loadCache();
    compiler.hooks.loadModule.tap(this.name, (file, data) => {
      if (data.components) {
        componentsCompiler.merge(data.components);
      }
    });
    compiler.hooks.done.tap(this.name, () => {
      const router = routerCompiler.compile();
      const components = componentsCompiler.compile();

      componentsCompiler.saveCache();
      if (!fs.existsSync(mainSourceFile)) {
        fs.writeFileSync(
          mainSourceFile,
          `#include "main.h"

int main(int argc, char *argv[])
{
        lcui_app_init();
${router.initCode.map((line) => `        ${line}`).join("\n")}
        // Write code here to initialize your application,
        // such as loading configuration files, initializing functional modules
        // ...

        return lcui_app_run();
}
`
        );
      }
      fs.writeFileSync(
        mainHeaderFile,
        `#include <locale.h>
#include <LCUI.h>
#include <LCUI/main.h>
${[...router.includeCode, ...components.includeCode, ...router.globalCode]
  .filter(Boolean)
  .join("\n")}

static void lcui_app_init(void)
{
        setlocale(LC_CTYPE, "");
        lcui_init();
${[
  ...router.baseInitCode,
  ...router.componentsInitCode,
  ...components.initCode,
  ...router.initCode,
]
  .filter(Boolean)
  .map((line) => `        ${line}`)
  .join("\n")}
}

static int lcui_app_run(void)
{
        return lcui_run();
}

`
      );
      runXMake(compiler);
    });
  }
}
