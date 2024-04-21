import fs from "fs";
import path from "path";
import ts from "typescript";
import { getResourceLoaderName, parsePageRoute } from "../utils.js";
import { LoaderContext, LoaderInput, Module } from "../types.js";

export default async function TsLoader(
  this: LoaderContext,
  content: LoaderInput
) {
  const loader = this;
  const modules: Promise<Module>[] = [];
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
  await loader.generateModule(loader.resourcePath, () =>
    tsResult.outputText.replace(
      "react/jsx-runtime",
      "@lcui/react/lib/jsx-runtime.js"
    )
  );
  const { default: componentFunc } = await loader.importModule(
    loader.resourcePath
  );
  if (!(componentFunc instanceof Function)) {
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
  let componentName = componentFunc.displayName || componentFunc.name || name;

  if (options.target === "AppRouter") {
    componentName = parsePageRoute(loader.appDir, loader.resourcePath).ident;
  }

  // TODO: 处理一个 tsx 文件内有多个组件的情况
  const result = compile(
    componentFunc,
    {},
    {
      target: options.target,
      name: componentName,
    }
  );
  const basePath = path.join(dir, name);
  const sourceFilePath = `${basePath}.c`;
  const headerFilePath = `${basePath}.h`;
  const resourceLoaderName = getResourceLoaderName(name, componentName);

  if (!fs.existsSync(sourceFilePath)) {
    loader.emitFile(
      sourceFilePath,
      `#include "${base}.h"\n#include "${name}.h"\n\n${result.sourceCode}`
    );
  }
  if (!fs.existsSync(headerFilePath)) {
    loader.emitFile(
      headerFilePath,
      `#include <ui.h>\n\n${result.declarationCode}${
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
    components: [componentName],
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
      {
        name: "schema",
        children: [
          {
            name: "name",
            text: componentName,
          },
          ...result.refs.map((ref) => ({
            name: "ref",
            text: ref,
          })),
          {
            name: "code",
            text: result.typesCode,
            attributes: {
              kind: "types",
            },
          },
          {
            name: "code",
            text: result.reactCode,
          },
          {
            name: "template",
            children: [result.node],
          },
        ],
      },
    ],
  };
}
