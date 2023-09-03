import fs from "fs";
import path from "path";
import postcss from "postcss";
import postcssUrl from "postcss-url";
import postcssModules from "postcss-modules";
import { createHash } from "crypto";
import React from "react";
import ts from "typescript";
import json from "./json.js";
import { compileSass } from "./sass.js";

// TODO: 支持像 webpack 那样自定义资源文件路径生成规则，例如：assets/[hash:7].[ext]
function createResourceFile(inputPath, options) {
  const { name, ext } = path.parse(inputPath);
  const hash = createHash("sha256").update(inputPath).digest('hex');
  return {
    inputPath,
    outputPath: path.join(options.assetsDir, `${name}.${hash.substring(0, 8)}${ext}`),
  };
}

async function loadCSSFile({ ident, filename, start, end }, options) {
  let cssText = fs.readFileSync(filename, { encoding: "utf-8" });
  const resourceFiles = [];
  const mainExt = path.parse(filename).ext.toLowerCase();
  const secondExt = path.parse(path.parse(filename).name).ext.toLowerCase();
  const plugins = [
    postcssUrl({
      url(asset) {
        const resourceFile = createResourceFile(
          path.resolve(path.dirname(filename), asset.url),
          options
        );
        resourceFiles.push(resourceFile);
        return path.relative(options.appDir, resourceFile.outputPath);
      },
    }),
    secondExt === ".module" &&
      postcssModules({
        exportGlobals: true,
        getJSON() {},
      }),
  ].filter(Boolean);

  if ([".sass", ".scss"].includes(mainExt)) {
    cssText = compileSass(cssText, filename).css;
  }

  const result = await postcss(plugins)
    .process(cssText, { from: filename })
    .async();

  const cssExport = result.messages.find((m) => m.type === "export");
  const cssExportTokens = cssExport ? cssExport.exportTokens : {};
  return {
    filename,
    start,
    end,
    text: !ident
      ? ''
      : `const ${ident} = ${JSON.stringify(cssExportTokens)};`,
    resourceNode: {
      name: "resource",
      comment: `This css code string is compiled from file ${path.relative(
        path.dirname(options.filePath),
        filename
      )}`,
      attributes: {
        type: "text/css",
      },
      text: result.css,
    },
    resourceFiles,
  };
}

const loaders = [
  {
    test: /\.css$|\.s[ac]ss$/,
    load: loadCSSFile,
  },
];

function resolveImportPath(importPath, options) {
  const prefixes = ['./', '../', '.\\', '..\\'];
  if (prefixes.some((prefix) => importPath.startsWith(prefix))) {
    return path.resolve(path.parse(options.filePath).dir, importPath);
  }
  return path.join(options.projectDir, "node_modules", importPath);
}

async function loadResourceImports(input, options) {
  const importDeclarations = [];

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
          const loader = loaders.find(({ test }) => test.test(importPath));
          if (loader) {
            importDeclarations.push(
              loader.load(
                {
                  ident: node.importClause?.name.getText(),
                  filename: resolveImportPath(importPath, options),
                  text: node.getText(),
                  start: node.getStart(),
                  end: node.getEnd(),
                },
                options
              )
            );
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
  return Promise.all(importDeclarations);
}

function transformImports(code, resources) {
  let pos = 0;
  const segments = [];

  resources.forEach(({ start, end, text }) => {
    segments.push(code.substring(pos, start), text);
    pos = end + 1;
  });
  segments.push(code.substring(pos));
  return segments.join("");
}

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

function mergeResourceNodes(tree, imports) {
  return {
    name: "lcui-app",
    children: [
      ...imports.map((item) => item.resourceNode).filter(Boolean),
      {
        name: "ui",
        children: [tree],
      },
    ],
  };
}

function isSameFile(a, b) {
  if (fs.existsSync(a) && fs.existsSync(b)) {
    const astat = fs.statSync(a);
    const bstat = fs.statSync(b);
    return astat.mtimeMs === bstat.mtimeMs && astat.size === bstat.size;
  }
  return false;
}

function copyResourceFiles(imports, { cwd }) {
  imports.forEach(({ resourceFiles }) => {
    resourceFiles.forEach(({ inputPath, outputPath }) => {
      if (!isSameFile(inputPath, outputPath)) {
        const stat = fs.statSync(inputPath);
        console.log(
          `[lcui.react-tsx] copy ${path.relative(
            cwd,
            inputPath
          )} -> ${path.relative(cwd, outputPath)}`
        );
        fs.copyFileSync(inputPath, outputPath);
        fs.utimesSync(outputPath, stat.atime, stat.mtime);
      }
    });
  });
}

async function compile(input, options) {
  const resources = await loadResourceImports(input, options);
  const tsCode = transformImports(input, resources);
  const result = ts.transpileModule(tsCode, {
    fileName: options.filePath,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.React,
    },
  });
  const output = path.parse(path.join(options.buildDir, options.filePath));
  const outputPath = path.join(output.dir, `${output.name}.mjs`);
  if (!fs.existsSync(output.dir)) {
    fs.mkdirSync(output.dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, result.outputText, { encoding: "utf-8" });
  const component = (await import(`file://${outputPath}`)).default;
  const reactTree = transformReactElement(component());
  const jsonTree = mergeResourceNodes(reactTree, resources);
  copyResourceFiles(resources, options);
  return json.compileData(jsonTree, options);
}

export default {
  test: /\.tsx$/,
  compile,
};
