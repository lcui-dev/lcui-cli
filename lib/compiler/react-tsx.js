import fs from "fs";
import path from "path";
import postcss from "postcss";
import postcssModules from "postcss-modules";
import postcssSass from "postcss-sass";
import React from "react";
import ts from "typescript";
import json from "./json.js";

async function loadCSSFiles(input, options) {
  const files = [];

  async function loadCSSFile({ ident, filename, start, end }) {
    const cssText = fs.readFileSync(filename, { encoding: "utf-8" });
    const mainExt = path.parse(filename).ext.toLowerCase();
    const secondExt = path.parse(path.parse(filename).name).ext.toLowerCase();
    const plugins = [
      [".sass", ".scss"].includes(mainExt) && postcssSass(),
      secondExt === ".module" &&
        postcssModules({
          exportGlobals: true,
        }),
    ].filter(Boolean);

    const result = await postcss(plugins)
      .process(cssText, { from: filename })
      .async();

    const cssExport = result.messages.find((m) => m.type === "export");
    return {
      filename,
      ident,
      css: result.css,
      start,
      end,
      exports: cssExport ? cssExport.exportTokens : {},
    };
  }

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
          const importPath = node.moduleSpecifier.getText().slice(1, -1);
          const name = path.parse(importPath).base.toLowerCase();

          if (name.endsWith(".css") || name.endsWith(".scss")) {
            files.push({
              ident: node.importClause.name?.getText(),
              filename: path.resolve(
                path.parse(sourceFile.fileName).dir,
                importPath
              ),
              start: node.getStart(),
              end: node.getEnd(),
            });
          }
        }
        return ts.visitEachChild(node, visitor, context);
      }

      return ts.visitNode(sourceFile, visitor);
    };
  }

  ts.transpileModule(input, {
    fileName: options.filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.React,
    },
    transformers: {
      before: [transformer],
    },
  });
  return Promise.all(files.map(loadCSSFile));
}

function replaceCSSImportStatments(code, files) {
  let pos = 0;
  const segments = [];

  files.forEach(({ start, end, ident, exports }) => {
    segments.push(code.substring(pos, start));
    segments.push(`const ${ident} = ${JSON.stringify(exports)};`);
    pos = end + 1;
  });
  segments.push(code.substring(pos));
  return segments.join("");
}

function transformReactElement(el) {
  const node = {
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
        break;
    }
  } else if (typeof el.type === "function") {
    node.name = el.type.constructor.name;
  } else {
    return;
  }

  const attrMap = {
    className: 'class',
    $ref: "ref"
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
    node.attributes[key] = el.props[propKey];
  });
  return node;
}

function mergeResourceElements(tree, files, sourceFileName) {
  return {
    ...tree,
    children: [
      ...files.map((file) => ({
        type: "element",
        name: "resource",
        comment: `This css code string is compiled from file ${path.relative(
          path.dirname(sourceFileName),
          file.filename,
        )}`,
        attributes: {
          type: "text/css",
        },
        text: file.css,
      })),
      ...tree.children,
    ],
  };
}

async function compile(input, options) {
  const files = await loadCSSFiles(input, options);
  const tsCode = replaceCSSImportStatments(input, files);
  const result = ts.transpileModule(tsCode, {
    fileName: options.filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.React,
    },
  });
  const output = path.parse(path.join(options.buildDir, options.filePath));
  const outputPath = path.join(output.dir, `${output.name}.js`);
  fs.writeFileSync(outputPath, result.outputText, { encoding: "utf-8" });
  const component = (await import(`file://${outputPath}`)).default;
  const reactTree = transformReactElement(component());
  const jsonTree = mergeResourceElements(reactTree, files, options.filePath);
  return json.compileData(jsonTree, options);
}

export default {
  test: /\.tsx$/,
  compile,
};
