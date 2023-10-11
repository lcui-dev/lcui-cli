import path from "path";
import ts from "typescript";
import React from "react";

function transformReactElement(el) {
  let node = {
    type: "element",
    name: "",
    text: "",
    attributes: {},
    children: [],
  };

  if (el.type === React.Fragment) {
    throw new SyntaxError("React.Fragment is not supported");
  }
  if (typeof el.type === "string") {
    switch (el.type) {
      case "div":
      case "w":
      case "widget":
        node.name = "widget";
        break;
      default:
        node.name = el.type;
        break;
    }
  } else if (typeof el.type === "function") {
    if (el.type.shouldPreRender) {
      const newNode = transformReactElement(el.type(el.props));
      if (el.props.$ref) {
        newNode.attributes.ref = el.props.$ref;
      }
      return newNode;
    }
    node.name = el.type.displayName || el.type.name;
  } else {
    return;
  }

  const attrMap = {
    className: "class",
    $ref: "ref",
  };
  Object.keys(el.props).forEach((propKey) => {
    let key = propKey;

    if (key === "children") {
      React.Children.forEach(el.props.children, (child) => {
        if (typeof child === "string" || typeof child === "number") {
          node.text = `${node.text}${child}`;
          return;
        }
        node.children.push(transformReactElement(child));
      });
      return;
    }
    if (key in attrMap) {
      key = attrMap[key];
    }
    if (typeof el.props[propKey] !== "undefined") {
      node.attributes[key] = el.props[propKey];
    }
  });
  return node;
}

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

  const result = ts.transpileModule(`${content}`, {
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
  await this.generateModule(loader.resourcePath, () => result.outputText);
  const exports = await loader.importModule(this.resourcePath);
  if (!(exports.default instanceof Function)) {
    return;
  }
  const compoentFunc = exports.default;
  const reactTree = transformReactElement(compoentFunc());
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
        name: "meta",
        attributes: {
          name: "prototype",
          content:
            compoentFunc.displayName ||
            compoentFunc.name ||
            path.parse(this.resourcePath).name,
        },
      },
      {
        name: "ui",
        children: [reactTree],
      },
    ],
  };
}
