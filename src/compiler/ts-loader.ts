import fs from "fs";
import path from "path";
import ts from "typescript";
import React from "react";
import { getResourceLoaderName, parsePageRoute } from "../utils.js";
import { LoaderContext, LoaderInput, Module } from "../types.js";

function isComponentFunc(name: string) {
  return name.charAt(0) >= "A" && name.charAt(0) <= "Z";
}

export default async function TsLoader(
  this: LoaderContext,
  content: LoaderInput
) {
  const loader = this;
  const modules: Promise<Module>[] = [];
  const localFuncNames: string[] = [];
  const outputDirPath = path.dirname(loader.resolveModule(loader.resourcePath));

  function transformer(context: ts.TransformationContext) {
    return (sourceFile) => {
      function visitor(node: ts.Node) {
        if (ts.isImportDeclaration(node)) {
          const importPath = node.moduleSpecifier
            .getText(sourceFile)
            .slice(1, -1);
          let modulePath = loader.resolveModule(importPath);
          modules.push(loader.importModule(importPath));
          if (modulePath.startsWith(loader.buildDir)) {
            modulePath = path.relative(outputDirPath, modulePath);
            modulePath = `.${path.sep}${modulePath}`;
          }
          return ts.factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            ts.factory.createStringLiteral(modulePath.replace(/\\|\//g, "/")),
            node.attributes
          );
        }
        if (
          ts.isFunctionDeclaration(node) &&
          node.name &&
          isComponentFunc(node.name.getText())
        ) {
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

  const assets = (await Promise.all(modules)).filter(
    (m) => m?.metadata?.type === "asset"
  );
  await loader.generateModule(
    loader.resourcePath,
    () =>
      tsResult.outputText.replace(
        "react/jsx-runtime",
        "@lcui/react/lib/jsx-runtime.js"
      ) + `\n\nexport const componentList = [${localFuncNames.join(", ")}];\n`
  );
  const { default: defaultComponentFunc, componentList } =
    await loader.importModule(loader.resourcePath);

  if (componentList.length < 1) {
    return;
  }

  const { compile } = await import(
    `file://${path.join(
      loader.modulesDir,
      "@lcui",
      "react",
      "lib",
      "index.js"
    )}`
  );
  const options = this.getOptions();
  const { dir, name, base } = path.parse(loader.resourcePath);
  let defaultComponentName =
    defaultComponentFunc?.displayName || defaultComponentFunc?.name || name;

  if (options.target === "AppRouter") {
    defaultComponentName = parsePageRoute(
      loader.appDir,
      loader.resourcePath
    ).ident;
  }

  const result = (componentList as React.FC[]).map(
    (component, i) =>
      compile(
        component,
        {},
        {
          target:
            defaultComponentFunc === component ? options.target : undefined,
          name:
            component.displayName || component.name || `UnnamedComponent${i}`,
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
  const resourceLoaderName = getResourceLoaderName(name, defaultComponentName);

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
      `#include <ui.h>\n\n${result
        .map((item) => item.declarationCode)
        .join("\n\n")}${
        resourceLoaderName ? `\nvoid ${resourceLoaderName}(void);\n` : ""
      }`
    );
  }
  if (!loader.data.components) {
    loader.data.components = {};
  }
  loader.data.components[
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
