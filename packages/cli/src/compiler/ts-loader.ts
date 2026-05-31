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

export default async function TsLoader(this: LoaderContext, content: LoaderInput) {
  const loader = this;
  const modules: Promise<Module>[] = [];
  const localFuncNames: string[] = [];
  const outputDirPath = path.dirname(loader.resolveModule(loader.resourcePath));

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
        if (ts.isFunctionDeclaration(node) && node.name && isComponentFunc(node.name.getText())) {
          localFuncNames.push(node.name.getText());
        } else if (
          ts.isVariableDeclaration(node) &&
          node.initializer &&
          ts.isArrowFunction(node.initializer) &&
          isComponentFunc(node.name.getText())
        ) {
          localFuncNames.push(node.name.getText());
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
  await loader.generateModule(
    loader.resourcePath,
    () =>
      tsResult.outputText.replace("react/jsx-runtime", "@lcui/react/jsx-runtime") +
      `\n\nexport const componentList = [${localFuncNames.join(", ")}];\n`
  );
  const importedModule = (await loader.importModule(loader.resourcePath)) as Module & {
    default: (React.FC & { displayName?: string }) | undefined;
    componentList: React.FC[];
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
  let defaultComponentName =
    defaultComponentFunc?.displayName || defaultComponentFunc?.name || name;

  const isInAppDir = loader.appDir && loader.resourcePath.startsWith(loader.appDir + path.sep);
  if (options.target === "AppRouter" || isInAppDir) {
    defaultComponentName = parsePageRoute(loader.appDir, loader.resourcePath).ident;
  }

  const componentName = snakeCase(defaultComponentName);

  const result = (componentList as React.FC[]).map(
    (component) =>
      compile(
        component,
        {},
        {
          target: defaultComponentFunc === component ? options.target : undefined,
          name: componentName,
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
      }
  );
  const basePath = path.join(dir, name);
  const sourceFilePath = `${basePath}.c`;
  const headerFilePath = `${basePath}.h`;
  const resourceLoaderName = getResourceLoaderName(name, componentName);

  if (!fs.existsSync(sourceFilePath)) {
    loader.emitFile(
      sourceFilePath,
      `#include "${base}.h"\n#include "${name}.h"\n\n${result
        .map((item) => item.sourceCode)
        .join("\n\n")}`
    );
  }
  if (!fs.existsSync(headerFilePath)) {
    loader.emitFile(
      headerFilePath,
      `#include <ui.h>\n\n${result.map((item) => item.declarationCode).join("\n\n")}${
        resourceLoaderName ? `\nvoid ${resourceLoaderName}(void);\n` : ""
      }`
    );
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
