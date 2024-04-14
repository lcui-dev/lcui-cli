import fs from "fs";
import path from "path";
import ts from "typescript";
import { getResourceLoaderName } from "./utils.js";

/** @type {Loader} */
export default async function TsLoader(content) {
  const loader = this;
  /** @type {Promise<Module>[]} */
  const modules = [];
  const outputDirPath = path.dirname(loader.resolveModule(loader.resourcePath));

  /**
   * @param {ts.TransformationContext} context
   * @returns {ts.Transformer<ts.SourceFile>}
   */
  function transformer(context) {
    return (sourceFile) => {
      /**
       *
       * @param {ts.Node} node
       * @returns {ts.Node}
       */
      function visitor(node) {
        if (ts.isImportDeclaration(node)) {
          const importPath = node.moduleSpecifier
            .getText(sourceFile)
            .slice(1, -1);
          let modulePath = loader.resolveModule(importPath);
          modules.push(loader.importModule(importPath));
          if (modulePath.startsWith(loader.buildDirPath)) {
            modulePath = path.relative(outputDirPath, modulePath);
            modulePath = `.${path.sep}${modulePath}`;
          }
          return ts.factory.createImportDeclaration(
            node.modifiers,
            node.importClause,
            ts.factory.createStringLiteral(modulePath.replace(/\\|\//g, "/"))
          );
        }
        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(sourceFile, visitor);
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
      loader.modulesDirPath,
      "@lcui",
      "react",
      "lib",
      "index.js"
    )}`
  );
  // TODO: 处理一个 tsx 文件内有多个组件的情况
  const result = compile(componentFunc, {});
  const { dir, name, base } = path.parse(loader.resourcePath);
  const basePath = path.join(dir, name);
  const sourceFilePath = `${basePath}.c`;
  const headerFilePath = `${basePath}.h`;
  const componentName =
    componentFunc.displayName ||
    componentFunc.name ||
    path.parse(loader.resourcePath).name;
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
