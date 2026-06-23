import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import ts from "typescript";
import React from "react";
import { snakeCase } from "change-case-all";
import { getResourceLoaderName, parsePageRoute } from "../utils.js";
import { LoaderContext, LoaderInput, Module } from "../types.js";

function isComponentFunc(name: string) {
  return name.charAt(0) >= "A" && name.charAt(0) <= "Z";
}

type ComponentExportKind = "default" | "named" | "internal";

interface ComponentMeta {
  name: string;
  kind: ComponentExportKind;
  hasExplicitDisplayName: boolean;
}

/**
 * 路径派生命名（`parsePageRoute`）仅用于 `page.tsx` / `layout.tsx`：
 * 这两类文件的默认导出函数名通常都叫 `Page` / `Layout`，必须依赖路径
 * 才能产生唯一标识。其它 tsx 文件统一用 `displayName || function.name`，
 * 这样组件在被 import 时，JSX runtime 给它生成的 widget tag
 * （也来自 `displayName || function.name`，见 `@lcui/react` 的 compile.ts）
 * 与该组件注册的 prototype 名一致，不会再出现 mismatch。
 */
function shouldDeriveNameFromRoute(resourcePath: string) {
  const { name } = path.parse(resourcePath);
  return name === "page" || name === "layout";
}

/**
 * 跨入口共享的组件名注册表，用于检测多个 tsx 文件产生相同 `snake_case` 名
 * 时的冲突。按 `rootContext` 分桶，避免不同项目之间互相干扰；同一项目里
 * 同一 `resourcePath` 重复注册（例如增量编译中复用 entry 不会真的进 loader，
 * 但 watch 模式 / 单测多次构建会重复进入）视作幂等，不报错。
 */
const componentNameRegistries = new Map<string, Map<string, string>>();

function registerComponentName(rootContext: string, componentName: string, resourcePath: string) {
  let registry = componentNameRegistries.get(rootContext);
  if (!registry) {
    registry = new Map();
    componentNameRegistries.set(rootContext, registry);
  }
  const existing = registry.get(componentName);
  if (existing && existing !== resourcePath) {
    throw new Error(
      `Duplicate component widget name "${componentName}" generated from two files:\n` +
        `  - ${path.relative(rootContext, existing)}\n` +
        `  - ${path.relative(rootContext, resourcePath)}\n` +
        `Rename one of the default-exported components (or set displayName) to make them unique.`
    );
  }
  registry.set(componentName, resourcePath);
}

export default async function TsLoader(this: LoaderContext, content: LoaderInput) {
  const loader = this;
  const modules: Promise<Module>[] = [];
  const localComponents: ComponentMeta[] = [];
  const outputDirPath = path.dirname(loader.resolveModule(loader.resourcePath));

  function getExportKind(node: ts.Node): ComponentExportKind | null {
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    if (!modifiers) return "internal";
    let hasExport = false;
    let hasDefault = false;
    for (const mod of modifiers) {
      if (mod.kind === ts.SyntaxKind.ExportKeyword) hasExport = true;
      if (mod.kind === ts.SyntaxKind.DefaultKeyword) hasDefault = true;
    }
    if (hasDefault) return "default";
    if (hasExport) return "named";
    return "internal";
  }

  function transformer(context: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile) => {
      function visitor(node: ts.Node): ts.Node {
        if (ts.isImportDeclaration(node)) {
          const importPath = node.moduleSpecifier.getText(sourceFile).slice(1, -1);
          const modulePath = loader.resolveModule(importPath);
          modules.push(loader.importModule(importPath));

          // 所有绝对路径一律转成相对路径写入 .mjs，避免出现裸 Windows
          // 盘符（如 F:/...）触发 ERR_UNSUPPORTED_ESM_URL_SCHEME。
          // 裸模块名（如 "react"）不是绝对路径，保留原样交给 Node 解析。
          let rewritten: string;
          if (path.isAbsolute(modulePath)) {
            let rel = path.relative(outputDirPath, modulePath);
            if (!rel.startsWith(".") && !rel.startsWith("..")) {
              rel = `.${path.sep}${rel}`;
            }
            rewritten = rel.replace(/\\|\//g, "/");
          } else {
            rewritten = modulePath.replace(/\\|\//g, "/");
          }

          return ts.factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            ts.factory.createStringLiteral(rewritten),
            node.attributes
          );
        }
        if (
          ts.isFunctionDeclaration(node) &&
          node.name &&
          isComponentFunc(node.name.getText(sourceFile))
        ) {
          localComponents.push({
            name: node.name.getText(sourceFile),
            kind: getExportKind(node) ?? "internal",
            hasExplicitDisplayName: false,
          });
        } else if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isArrowFunction(node.initializer) &&
          ts.isIdentifier(node.name) &&
          isComponentFunc(node.name.getText(sourceFile))
        ) {
          const parent = node.parent;
          const stmt = parent?.parent;
          localComponents.push({
            name: node.name.getText(sourceFile),
            kind: stmt ? (getExportKind(stmt) ?? "internal") : "internal",
            hasExplicitDisplayName: false,
          });
        } else if (
          ts.isExpressionStatement(node) &&
          ts.isBinaryExpression(node.expression) &&
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
          ts.isPropertyAccessExpression(node.expression.left) &&
          ts.isIdentifier(node.expression.left.expression) &&
          node.expression.left.name.getText(sourceFile) === "displayName"
        ) {
          const targetName = node.expression.left.expression.getText(sourceFile);
          const comp = localComponents.find((c) => c.name === targetName);
          if (comp) comp.hasExplicitDisplayName = true;
        }
        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(sourceFile, visitor) as ts.SourceFile;
    };
  }

  // TODO: 考虑改成从项目目录内的 tsconfig.json 读取配置
  const tsResult = ts.transpileModule(`${content}`, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
    transformers: {
      before: [transformer],
    },
  });

  const assets = (await Promise.all(modules)).filter((m) => m?.metadata?.type === "asset");
  const fileName = path.parse(loader.resourcePath).name;
  const filePrefix = snakeCase(fileName);
  const internalDisplayNameInjections = localComponents
    .filter((c) => c.kind === "internal" && !c.hasExplicitDisplayName)
    .map((c) => {
      const baseSnake = snakeCase(c.name);
      if (baseSnake.startsWith(filePrefix)) return null;
      return `${c.name}.displayName = "${filePrefix}__${baseSnake}";`;
    })
    .filter((s): s is string => s !== null)
    .join("\n");
  await loader.generateModule(
    loader.resourcePath,
    () =>
      tsResult.outputText.replace("react/jsx-runtime", "@lcui/react/jsx-runtime") +
      `\n${internalDisplayNameInjections}\n` +
      `\nexport const componentList = [${localComponents.map((c) => c.name).join(", ")}];\n`
  );
  const importedModule = (await loader.importModule(loader.resourcePath)) as Module & {
    default: (React.FC & { displayName?: string }) | undefined;
    componentList: (React.FC & { displayName?: string })[];
  };
  const { default: defaultComponentFunc, componentList } = importedModule;

  if (componentList.length < 1) {
    return;
  }

  const { compile } = await import(
    pathToFileURL(path.join(loader.modulesDir, "@lcui", "react", "lib", "index.js")).href
  );
  const options = this.getOptions();
  const { dir, name, base } = path.parse(loader.resourcePath);

  // 默认沿用导出函数的 displayName / 函数名；缺失时回退到文件名。
  // 唯一会"用路径覆盖函数名"的情况是 page.tsx / layout.tsx：
  // 它们的 default export 通常都叫 Page / Layout，必须用路径才能唯一区分。
  // 其它 tsx 文件保留函数名，这样在被别处 import 时（@lcui/react 的 JSX
  // 编译也走 displayName || function.name），widget tag 与 prototype 名一致。
  const defaultFuncName = defaultComponentFunc?.displayName || defaultComponentFunc?.name;
  const useRouteIdent =
    options.target === "AppRouter" ||
    (loader.appDir &&
      loader.resourcePath.startsWith(loader.appDir + path.sep) &&
      shouldDeriveNameFromRoute(loader.resourcePath));

  let defaultComponentSnakeName: string;
  if (defaultComponentFunc) {
    let defaultComponentName: string;
    if (useRouteIdent) {
      defaultComponentName = parsePageRoute(loader.appDir, loader.resourcePath).ident;
    } else if (defaultFuncName) {
      defaultComponentName = defaultFuncName;
    } else {
      // 匿名默认导出（例如 `export default () => ...`）拿不到稳定标识，
      // 在被 import 时也无法正确匹配 widget tag。要求用户显式命名。
      throw new Error(
        `Default-exported component in ${path.relative(
          loader.rootContext,
          loader.resourcePath
        )} has no usable name. ` +
          `Use a named function/declaration (e.g. \`export default function Foo() {}\`) ` +
          `or assign a displayName so it can be referenced as a widget.`
      );
    }
    defaultComponentSnakeName = snakeCase(defaultComponentName);
  } else {
    defaultComponentSnakeName = snakeCase(fileName);
  }
  if (defaultComponentFunc) {
    registerComponentName(loader.rootContext, defaultComponentSnakeName, loader.resourcePath);
  }

  const result = localComponents
    .map((meta) => {
      const component = componentList.find(
        (c) => c.displayName === meta.name || c.name === meta.name
      ) as (React.FC & { displayName?: string; shouldPreRender?: boolean }) | undefined;
      if (!component) {
        throw new Error(`Could not find component "${meta.name}" in componentList after transpile`);
      }
      if (component.shouldPreRender) {
        return null;
      }
      let componentName: string;
      if (meta.kind === "default") {
        componentName = defaultComponentSnakeName;
      } else if (meta.hasExplicitDisplayName && component.displayName) {
        componentName = component.displayName;
        registerComponentName(loader.rootContext, componentName, loader.resourcePath);
      } else if (meta.kind === "named") {
        componentName = snakeCase(meta.name);
        registerComponentName(loader.rootContext, componentName, loader.resourcePath);
      } else {
        const baseSnake = snakeCase(meta.name);
        componentName = baseSnake.startsWith(filePrefix)
          ? baseSnake
          : `${filePrefix}__${baseSnake}`;
        registerComponentName(loader.rootContext, componentName, loader.resourcePath);
      }
      return compile(
        component,
        {},
        {
          target: component === defaultComponentFunc ? options.target : undefined,
          name: componentName,
          filePath: loader.resourcePath,
        }
      ) as {
        name: string;
        node: any;
        refs: string[];
        headerFiles: string[];
        typesCode: string;
        reactCode: string;
        sourceCode: string;
        declarationCode: string;
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const basePath = path.join(dir, name);
  const sourceFilePath = `${basePath}.c`;
  const headerFilePath = `${basePath}.h`;
  const resourceLoaderName = getResourceLoaderName(name, defaultComponentSnakeName);

  if (!fs.existsSync(sourceFilePath)) {
    loader.emitFile(
      sourceFilePath,
      `#include "${base}.h"\n#include "${name}.h"\n\n${result
        .map((item) => item.sourceCode)
        .join("\n\n")}`
    );
  } else {
    loader.addOutput(sourceFilePath);
  }
  if (!fs.existsSync(headerFilePath)) {
    loader.emitFile(
      headerFilePath,
      `#include <ui.h>\n\n${result.map((item) => item.declarationCode).join("\n\n")}${
        resourceLoaderName ? `\nvoid ${resourceLoaderName}(void);\n` : ""
      }`
    );
  } else {
    loader.addOutput(headerFilePath);
  }
  if (!loader.data.components) {
    loader.data.components = {};
  }
  (loader.data.components as Record<string, unknown>)[
    path.relative(loader.rootContext, loader.resourcePath)
  ] = {
    resourceLoaderName,
    headerFilePath: path.relative(loader.rootContext, headerFilePath),
    assets,
    components: result.map((item) => item.name),
  };
  return {
    name: "lcui-app",
    children: [
      { name: "default-component", text: defaultComponentSnakeName },
      ...assets.map((asset) => ({
        name: "resource",
        attributes: {
          src: asset.metadata.path,
        },
      })),
      ...result.map((item) => ({
        name: "schema",
        children: [
          {
            name: "name",
            text: item.name,
          },
          ...item.refs.map((ref) => ({
            name: "ref",
            text: ref,
          })),
          ...item.headerFiles.map((file) => ({
            name: "include",
            text: file,
          })),
          {
            name: "code",
            text: item.typesCode,
            attributes: {
              kind: "types",
            },
          },
          {
            name: "code",
            text: item.reactCode,
          },
          {
            name: "template",
            children: [item.node],
          },
        ],
      })),
    ],
  };
}
