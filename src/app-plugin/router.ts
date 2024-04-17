import fs from "fs";
import path from "path";
import { CompilerOptions } from "../types.js";

interface RouteConfig {
  page: string;
  layout: string;
  notFound: string;
  children: RouteConfig[];
}

function scanAppRoute(appDir: string, basePath = '/') {
  function scanRoute(dir: string) {
    const route: RouteConfig = {
      page: "",
      layout: "",
      notFound: "",
      children: [],
    };
    fs.readdirSync(dir).forEach((name) => {
      const filePath = path.join(dir, name);
      const routePath = `${basePath}${filePath.substring(appDir.length)}`;
      switch (path.parse(name).name) {
        case "page":
          route.page = routePath;
          return;
        case "layout":
          route.layout = routePath;
          return;
        case "not-found":
          route.notFound = routePath;
          return;
        default:
          break;
      }
      if (fs.statSync(filePath).isDirectory()) {
        const childRoute = scanRoute(filePath);
        if (childRoute.page) {
          route.children.push(childRoute);
        }
      }
    });
    return route;
  }

  return scanRoute(appDir);
}

function compileAppRoute(route: RouteConfig) {
  const identList: string[] = [];
  const lines: string[] = [];
  const s = (str: any) =>
    typeof str === "string" ? JSON.stringify(str) : "NULL";

  function toIdent(routePath: string) {
    return routePath.replace(/[^a-zA-Z0-9]/g, "_");
  }

  function compileRoute(route: RouteConfig, parent = "NULL") {
    const pathname = path.dirname(route.page);
    const ident = toIdent(pathname.substring(1));
    const pageName = ['app', ident, 'page'].filter(Boolean).join('_');
    lines.push(
      "config = router_config_create()",
      `router_config_set_path(config, ${s(pathname)})`,
      `router_config_set_component(config, NULL, ${s(pageName)})`
    );
    if (route.children.length > 0) {
      identList.push(ident);
      lines.push(
        `${ident} = router_add_route_record(router, config, ${parent})`,
        "router_config_destroy(config)",
        ""
      );
      route.children.forEach((child) => compileRoute(child, ident));
    } else {
      lines.push(
        `router_add_route_record(router, config, ${parent})`,
        "router_config_destroy(config)",
        ""
      );
    }
  }

  compileRoute(route);
  return [
    "router_t *create_app_router(void)",
    "{",
    [
      `router_config_t *config`,
      ...identList.map((id) => `router_route_record_t *${id}`),
      'router_t *router = router_create("AppRouter")',
      "",
      ...lines,
      "return router",
    ]
      .map((line) => (!line ? line : `        ${line};`))
      .join("\n"),
    "}",
    "",
  ].join("\n");
}

export function compileAppRouter(options: CompilerOptions) {
  const route = scanAppRoute(options.appDir);
  return {
    includeCode: '#include <ui_router.h>',
    globalCode: compileAppRoute(route),
  }
}
