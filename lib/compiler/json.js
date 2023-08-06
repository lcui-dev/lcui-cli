import fs from "fs";
import path from "path";
import css from "./css.js";
import sass from "./sass.js";

function toIdent(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function compile(jsonData, { filePath, indent = 8 }) {
  let count = 0;
  const { name: fileName, base: fileBase } = path.parse(filePath);
  const identPrefix = toIdent(fileName);
  const globalLines = [];
  const resourceLines = [];
  const refs = [];
  const templateLines = [];
  const indentStr = " ".repeat(indent);

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
          resourceLines.push(
            `pd_font_library_load_file(${JSON.stringify(attrs.src)});`
          );
          return;
        }
        if (["text/css", "text/scss", "text/sass"].includes(attrs.type)) {
          const options = { filePath };
          let cssText = text;

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
          globalLines.push(cssCode);
          resourceLines.push(
            `ui_load_css_string(${ident}, ${JSON.stringify(
              path.parse(options.filePath).base
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
        templateLines.push(
          `${ident} = ui_create_widget(${type ? `"${type}"` : "NULL"});`
        );
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
        if (text) {
          templateLines.push(
            `ui_widget_set_text(${ident}, ${JSON.stringify(text)});`
          );
        }
        break;
    }
    children
      .map(([childName, childData]) => translateNode(childName, childData))
      .forEach((childIdent) => {
        if (ident && childIdent) {
          templateLines.push(`ui_widget_append(${ident}, ${childIdent});`);
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
    `static void ${identPrefix}_load_template(ui_widget_t *${identPrefix}_parent${
      refs.length > 0 ? `, ${identPrefix}_refs_t *refs` : ""
    })`,
    "{",
    ...[`ui_widget_t *w[${count}];`, "", ...templateLines].map((line) =>
      line ? `${indentStr}${line}` : line
    ),
    "}",
    "",
    ...(resourceLines.length > 0
      ? [
          `static void ${identPrefix}_load_resources(void)`,
          "{",
          ...resourceLines.map((line) => (line ? `${indentStr}${line}` : line)),
          "}",
          "",
        ]
      : []),
  ].join("\n");
}

export default {
  test: /\.json$/,
  compile,
};
