import React from "react";
import ts from "typescript";

function transformReactElement(el) {
  let node = {
    type: "element",
    name: "",
    text: "",
    attributes: {},
    children: [],
  };

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
    node.name = el.type.constructor.name;
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

  /**
   *
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
          const importPath = node.moduleSpecifier.getText(sourceFile);
          modules.push(loader.importModule(importPath));
          return ts.factory.updateImportDeclaration(
            node,
            node.decorators,
            node.modifiers,
            node.importClause,
            ts.factory.createStringLiteral(loader.resolveModule(importPath))
          );
        }
        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(sourceFile, visitor);
    };
  }

  this.generateModule(loader.resourcePath, () => {
    const result = ts.transpileModule(content, {
      fileName: loader.resourcePath,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        jsx: ts.JsxEmit.React,
      },
      transformers: {
        before: [transformer],
      },
    });
    return result.outputText;
  });
  const assets = (await Promise.all(modules)).filter(
    (m) => m.metadata.type === "asset"
  );
  const component = (await loader.importModule(this.resourcePath)).default;
  const reactTree = transformReactElement(component());
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
        name: "ui",
        children: [reactTree],
      },
    ],
  };
}
