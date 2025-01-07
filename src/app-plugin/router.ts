import fs from "fs-extra";
import path from "path";
import { CompilerOptions } from "../types.js";
import { parsePageRoute } from "../utils.js";

interface RouteConfig {
  page: string;
  layout?: string;
  notFound?: string;
  children: RouteConfig[];
}

function scanAppRoute(basePath: string) {
  function scanRoute(dir: string) {
    const route: RouteConfig = {
      page: "",
      layout: "",
      notFound: "",
      children: [],
    };
    fs.readdirSync(dir).forEach((name) => {
      const filePath = path.join(dir, name);
      switch (path.parse(name).name) {
        case "page":
          route.page = filePath;
          return;
        case "layout":
          route.layout = filePath;
          return;
        case "not-found":
          route.notFound = filePath;
          return;
        default:
          break;
      }
      if (fs.statSync(filePath).isDirectory()) {
        const childRoute = scanRoute(filePath);
        if (childRoute) {
          if (childRoute.layout) {
            route.children.push(childRoute);
          } else {
            route.children.push(...childRoute.children);
            if (childRoute.page) {
              route.children.push({
                ...childRoute,
                children: [],
              });
            }
          }
        }
      }
    });
    return route;
  }

  return scanRoute(basePath);
}

function compileAppRoute(appRoute: RouteConfig, context: string) {
  const identList: string[] = [];
  const lines: string[] = [];
  const s = (str: any) =>
    typeof str === "string" ? JSON.stringify(str) : "NULL";

  function compileRoute(
    config: RouteConfig,
    parentPath: string,
    parentIdent: string
  ) {
    const [route, children] = config.layout
      ? [
          parsePageRoute(context, config.layout),
          [...config.children, { page: config.page, children: [] }],
        ]
      : [parsePageRoute(context, config.page), config.children];

    lines.push(
      "",
      "config = router_config_create()",
      `router_config_set_path(config, ${s(
        route.path.substring(parentPath.length)
      )})`,
      `router_config_set_component(config, NULL, ${s(route.ident)})`
    );
    if (children.length > 0 || config.notFound) {
      identList.push(route.ident);
      lines.push(
        `${route.ident} = router_add_route_record(router, config, ${parentIdent})`,
        "router_config_destroy(config)"
      );
      children.forEach((child) => compileRoute(child, route.path, route.ident));
    } else {
      lines.push(
        `router_add_route_record(router, config, ${parentIdent})`,
        "router_config_destroy(config)"
      );
    }
    if (config.notFound) {
      lines.push(
        "config = router_config_create()",
        `router_config_set_path(config, "*")`,
        `router_config_set_component(config, NULL, ${s(route.ident)})`,
        `router_add_route_record(router, config, ${parentIdent})`,
        "router_config_destroy(config)",
        ""
      );
    }
  }

  if (!appRoute.layout) {
    throw new SyntaxError("Must have a root layout");
  }
  appRoute.children.forEach((route) => compileRoute(route, "", "NULL"));
  compileRoute({ page: appRoute.page, children: [] }, "", "NULL");
  return [
    "",
    "static void lcui_app_router_init(void)",
    "{",
    [
      `router_config_t *config`,
      ...identList.map((id) => `router_route_record_t *${id}`),
      'router_t *router = router_create("AppRouter")',
      ...lines,
    ]
      .map((line) => (!line ? line : `        ${line};`))
      .join("\n"),
    "}",
  ];
}

export class AppRouterCompiler {
  route: RouteConfig | null;
  active: boolean;

  constructor(private options: CompilerOptions) {
    this.active = fs.existsSync(options.appDir);
    this.route = this.active ? scanAppRoute(options.appDir) : null;
    this.active =
      this.active &&
      (this.route.children.length > 0 ||
        !!this.route.layout ||
        !!this.route.page);
  }

  compile() {
    const result = {
      includeCode: [],
      baseInitCode: [],
      componentsInitCode: [],
      initCode: [],
      mainInitCode: [],
      globalCode: [],
    };

    if (!this.active) {
      return result;
    }
    return {
      includeCode: ["#include <router.h>"],
      baseInitCode: ["lcui_app_router_init();"],
      componentsInitCode: [],
      initCode: [
        'ui_widget_set_attr(ui_root(), "router", "AppRouter");',
        "ui_widget_append(ui_root(), ui_create_root_layout());",
      ],
      mainInitCode: [
        "",
        '// Get app router and route to the root path "/", This means that',
        "// your app will present the user interface in app/page.ts",
        'router_t *router = router_get_by_name("AppRouter");',
        'router_location_t *location = router_location_create(NULL, "/");',
        "router_push(router, location);",
        "",
      ],
      globalCode: compileAppRoute(this.route, this.options.appDir),
    };
  }
}
