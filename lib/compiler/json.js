import fs from "fs";
import path from "path";
import css from "./css.js";
import sass from "./sass.js";

function toIdent(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function compileData(rootNode, { filePath, indent = 8 }) {
  let count = 0;
  let templateNode = null;
  const { name: fileName, base: fileBase } = path.parse(filePath);
  const identPrefix = toIdent(fileName);
  const refs = [];
  const globalLines = [];
  const resourceLines = [];
  const templateLines = [];
  const indentStr = " ".repeat(indent);
  const protoIdent = `${identPrefix}_proto`;
  const parentIdent = "parent";

  function generateRefsType() {
    return refs.length > 0
      ? [
          `typedef struct {`,
          ...refs.map((ref) => `${indentStr}ui_widget_t *${ref};`),
          `} ${identPrefix}_refs_t;`,
          "",
        ]
      : [];
  }

  function generateResourceFunc() {
    return resourceLines.length > 0
      ? [
          `static void ${identPrefix}_load_resources(void)`,
          "{",
          ...resourceLines.map((line) => (line ? `${indentStr}${line}` : line)),
          "}",
          "",
        ]
      : [];
  }

  function generateTemplateFunc() {
    return [
      `static void ${identPrefix}_load_template(ui_widget_t *parent${
        refs.length > 0 ? `, ${identPrefix}_refs_t *refs` : ""
      })`,
      "{",
      ...(count > 0 ? [`${indentStr}ui_widget_t *w[${count}];\n`] : []),
      ...templateLines.map((line) => (line ? `${indentStr}${line}` : line)),
      "}",
    ];
  }

  function generateProtoFunc() {
    let typeName = "NULL";

    if (!templateNode) {
      return [];
    }
    if (
      templateNode &&
      Array.isArray(templateNode.children) &&
      templateNode.children.length === 1
    ) {
      typeName = templateNode.children[0].name;
      if (typeName === "w" || typeName === "widget") {
        typeName = "NULL";
      } else {
        typeName = `"${typeName}"`;
      }
    }
    return [
      `static void ${identPrefix}_init_prototype(void)`,
      "{",
      `${indentStr}${protoIdent} = ui_create_widget_prototype("${fileName}", ${typeName});`,
      "}",
    ];
  }

  function translateNode(node) {
    let ident;
    let widgetType;
    const attrs = node.attributes || {};

    switch (node.name) {
      case "ui":
        ident = parentIdent;
        templateNode = node;
      case "lcui-app":
        break;
      case "resource":
        if (attrs.type.startsWith("application/font")) {
          resourceLines.push(
            `pd_font_library_load_file(${JSON.stringify(attrs.src)});`
          );
          return;
        }
        if (["text/css", "text/scss", "text/sass"].includes(attrs.type)) {
          const options = { filePath };
          let cssText = node.text;

          if (attrs.src) {
            options.filePath = path.resolve(filePath, "..", attrs.src);
            cssText = fs.readFileSync(options.filePath, {
              encoding: "utf-8",
            });
          }
          const cssCode =
            attrs.type === "text/css"
              ? css.compile(cssText, options)
              : sass.compile(cssText, options);
          ident = cssCode.substring("static const char *".length).split(" ")[0];
          if (node.comment) {
            globalLines.push(`/** ${node.comment} */`);
          }
          globalLines.push(cssCode);
          resourceLines.push(
            `ui_load_css_string(${ident}, ${JSON.stringify(
              path.parse(options.filePath).base
            )});`
          );
        }
        return;
      default:
        ident = null;
        if (["w", "widget"].includes(node.name)) {
          widgetType = attrs.type;
        } else {
          widgetType = node.name;
        }
        if (
          templateNode.children.length == 1 &&
          templateNode.children[0] === node
        ) {
          ident = parentIdent;
        } else {
          if (attrs.ref && typeof attrs.ref === "string") {
            ident = toIdent(attrs.ref);
            refs.push(ident);
            ident = `refs->${ident}`;
          } else {
            ident = `w[${count++}]`;
          }
          templateLines.push(
            `${ident} = ui_create_widget(${
              widgetType ? `"${widgetType}"` : "NULL"
            });`
          );
        }
        Object.keys(attrs).forEach((attrName) => {
          if (attrName === "class") {
            templateLines.push(
              `ui_widget_add_class(${ident}, ${JSON.stringify(
                attrs[attrName]
              )});`
            );
            return;
          }
          if (attrName === "ref") {
            return;
          }
          templateLines.push(
            `ui_widget_set_attr(${ident}, "${attrName}", ${JSON.stringify(
              attrs[attrName]
            )});`
          );
        });
        if (node.text) {
          templateLines.push(
            `ui_widget_set_text(${ident}, ${JSON.stringify(node.text)});`
          );
        }
        break;
    }
    if (Array.isArray(node.children)) {
      node.children.map(translateNode).forEach((childIdent) => {
        if (ident && childIdent && childIdent !== parentIdent) {
          templateLines.push(`ui_widget_append(${ident}, ${childIdent});`);
        }
      });
    }
    return ident;
  }
  translateNode(rootNode);
  return [
    `/** This file is generated from ${fileBase} */`,
    "",
    "#include <ui.h>",
    "",
    ...generateRefsType(),
    templateNode ? `static ui_widget_prototype_t *${protoIdent};\n` : "",
    ...globalLines,
    "",
    ...generateProtoFunc(),
    "",
    ...generateTemplateFunc(),
    "",
    ...generateResourceFunc(),
  ].join("\n");
}

export default {
  test: /\.json$/,
  compileData,
  compile(input, options) {
    return compileData(JSON.parse(input), options);
  },
};
