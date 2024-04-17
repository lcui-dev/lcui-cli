import fs from "fs-extra";
import path from "path";
import { AppComponentsCompiler } from "./components.js";
import { compileAppRouter } from "./router.js";
import { CompilerInstance } from "../types.js";

const mainFileContent = `#include "main.h"

int main(int argc, char *argv[])
{
        lcui_app_init();

        // Create a router and route to the root path "/", This means that
        // your app will present the user interface in app/page.tsx
        router_t *router = create_app_router();
        router_location_t *location = router_location_create(NULL, "/");
        router_push(router, location);

        // Write code here to initialize your application,
        // such as loading configuration files, initializing functional modules
        // ...

        return lcui_app_run();
}
`;

export default class AppPlugin {
  name = "AppPlugin";

  apply(compiler: CompilerInstance) {
    const { appDir } = compiler.options;
    const mainHeaderFile = path.join(appDir, "main.h");
    const mainSourceFile = path.join(appDir, "main.c");
    const componentsCompiler = new AppComponentsCompiler(compiler.options);

    componentsCompiler.loadCache();
    compiler.hooks.loadModule.tap(this.name, (file, data) => {
      if (data.components) {
        componentsCompiler.merge(data.components);
      }
    });
    compiler.hooks.done.tap(this.name, () => {
      const components = componentsCompiler.compile();
      const router = compileAppRouter(compiler.options);

      componentsCompiler.saveCache();
      if (!fs.existsSync(appDir)) {
        fs.mkdirpSync(appDir);
      }
      if (!fs.existsSync(mainSourceFile)) {
        fs.writeFileSync(mainSourceFile, mainFileContent);
      }
      fs.writeFileSync(
        mainHeaderFile,
        `#include <LCUI.h>
#include <LCUI/main.h>
${router.includeCode}
${components.includeCode}

${router.globalCode}

static void lcui_app_init(void)
{
        lcui_init();
${components.initCode}
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
