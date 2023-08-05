import fs from "fs";
import path from "path";
import css from "./css.js";
import sass from "./sass.js";

function toIdent(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function compile(jsonData, { filePath }) {
  let count = 0;
  const { name: fileName, base: fileBase } = path.parse(filePath);
  const identPrefix = toIdent(fileName);
  const globalLines = [];
  const initLines = [];
  const refs = [];
  const uiLines = [];
  const indentStr = "        ";

  function translateNode(name, data) {
    let ident;
    let type;
    let text = "";
    let attrs = {};
    let children = [];

    if (typeof data === "string") {
      text = data;
    } else if (data) {
      Object.keys(data).forEach((k) => {
        if (k.startsWith("@")) {
          attrs[k.substring(1)] = data[k];
          return;
        }
        if (k.startsWith("#")) {
          if (k === "#text") {
            text = data[k];
          }
          return;
        }
        if (Array.isArray(data[k])) {
          children.push(...data[k].map((item) => [k, item]));
          return;
        }
        children.push([k, data[k]]);
      });
    }
    switch (name) {
      case "ui":
        ident = `${identPrefix}_parent`;
      case "lcui-app":
        break;
      case "resource":
        if (attrs.type.startsWith("application/font")) {
          initLines.push(
            `pd_font_library_load_file(${JSON.stringify(attrs.src)});`
          );
          return;
        }
        if (["text/css", "text/scss", "text/sass"].includes(attrs.type)) {
          let cssFilePath;
          let cssText;

          if (attrs.src) {
            cssFilePath = path.resolve(filePath, "..", attrs.src);
            cssText = fs.readFileSync(cssFilePath, {
              encoding: "utf-8",
            });
          } else {
            cssFilePath = filePath;
            cssText = text;
          }
          const cssCode =
            attrs.type === "text/css"
              ? css.compile(cssText)
              : sass.compile(cssText);
          ident = cssCode.substring("const char *".length).split(" ")[0];
          globalLines.push(cssCode);
          initLines.push(
            `ui_load_css_string(${ident}, ${JSON.stringify(
              path.parse(cssFilePath).base
            )});`
          );
        }
        return;
      default:
        if (["w", "widget"].includes(name)) {
          type = attrs.type;
        } else {
          type = name;
        }
        if (attrs.ref && typeof attrs.ref === "string") {
          ident = toIdent(attrs.ref);
          refs.push(ident);
          ident = `refs->${ident}`;
        } else {
          ident = `w[${count++}]`;
        }
        uiLines.push(
          `${ident} = ui_create_widget(${type ? `"${type}"` : "NULL"});`
        );
        Object.keys(attrs).forEach((attrName) => {
          if (attrName === "class") {
            uiLines.push(
              `ui_widget_add_class(${ident}, ${JSON.stringify(
                attrs[attrName]
              )});`
            );
            return;
          }
          if (attrName === "ref") {
            return;
          }
          uiLines.push(
            `ui_widget_set_attr(${ident}, "${attrName}", ${JSON.stringify(
              attrs[attrName]
            )});`
          );
        });
        break;
    }
    children
      .map(([childName, childData]) => translateNode(childName, childData))
      .forEach((childIdent) => {
        if (ident && childIdent) {
          uiLines.push(`ui_widget_append(${ident}, ${childIdent});`);
        }
      });
    return ident;
  }
  translateNode("lcui-app", jsonData);
  return [
    `/** This file is generated from ${fileBase} */`,
    "",
    "#include <ui.h>",
    "",
    ...(refs.length > 0
      ? [
          `typedef struct {`,
          ...refs.map((ref) => `${indentStr}ui_widget_t *${ref};`),
          `} ${identPrefix}_refs_t;`,
          "",
        ]
      : []),
    ...globalLines,
    "",
    `static void ${identPrefix}_create(ui_widget_t *${identPrefix}_parent, ${identPrefix}_refs_t *refs)`,
    "{",
    ...[
      `ui_widget_t *w[${count}];`,
      "",
      ...uiLines,
      `return ${identPrefix}_parent;`,
    ].map((line) => (line ? `${indentStr}${line}` : line)),
    "}",
    "",
    `static void ${identPrefix}_install(void)`,
    "{",
    ...initLines.map((line) => (line ? `${indentStr}${line}` : line)),
    "}",
    "",
  ].join("\n");
}

export default {
  test: /\.json$/,
  compile,
};
