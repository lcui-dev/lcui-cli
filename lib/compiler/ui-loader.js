import path from "path";

function toIdent(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "_");
}

function toSnakeCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function toDashCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * 转换资源结点树为 C 代码
 * @param {ResourceNode} rootNode
 * @param {LoaderContext} context
 * @param {UILoaderOptions} options
 * @returns {string}
 */
async function transform(rootNode, context, { filePath, indent = 8 }) {
  let count = 0;
  let globalIdentCount = 0;
  let templateNode = null;
  const { name: fileName, base: fileBase } = path.parse(filePath);
  const identPrefix = toIdent(fileName);
  const refs = [];
  const metadata = {
    prototype: fileName,
  };
  const globalLines = [];
  const resourceLines = [];
  const headerFiles = ["<ui.h>"];
  const templateLines = [];
  const indentStr = " ".repeat(indent);
  const protoIdent = `${identPrefix}_proto`;
  const parentIdent = "parent";

  function createWidgetText(str) {
    const ident = `widget_text_${globalIdentCount++}`;
    globalLines.push(
      `// UTF-8 encoded string from: ${encodeURIComponent(str)}`,
      `static const char ${ident}[] = {${Buffer.from(str, "utf-8")
        .map((ch) => `0x${ch.toString(16)}`)
        .join(", ")}, 0};`
    );
    return ident;
  }

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

  function generateIncludings() {
    return Array.from(new Set(headerFiles)).map((file) => {
      let filePath = file;
      if (filePath.startsWith('"')) {
        filePath = `"${path.relative(
          context.context,
          filePath.substring(1, file.length - 1)
        )}"`;
      }
      return `#include ${filePath}`;
    });
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
      templateNode ? `static ui_widget_prototype_t *${protoIdent};\n` : "",
      `static void ${identPrefix}_init_prototype(void)`,
      "{",
      `${indentStr}${protoIdent} = ui_create_widget_prototype("${metadata.prototype}", ${typeName});`,
      "}",
    ];
  }

  async function translateNode(node) {
    let ident;
    let widgetType;
    const attrs = node.attributes || {};

    switch (node.name) {
      case "ui":
        ident = parentIdent;
        templateNode = node;
        break;
      case "lcui-app":
        break;
      case "resource": {
        const asset = await context.importModule(attrs.src);
        headerFiles.push(...asset.metadata.headerFiles);
        resourceLines.push(asset.metadata.initCode);
        return;
      }
      case "meta":
        metadata[attrs.name] = attrs.content;
        break;
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
          switch (attrName) {
            case "ref":
              break;
            case "class":
              templateLines.push(
                `ui_widget_add_class(${ident}, "${attrs[attrName]}");`
              );
              return;
            case "style":
              templateLines.push(
                ...Object.entries(attrs.style).map(([key, value]) => {
                  if (typeof value === "number") {
                    return `ui_widget_set_style_unit_value(${ident}, css_prop_${toSnakeCase(
                      key
                    )}, ${value}, CSS_UNIT_PX);`;
                  }
                  return `ui_widget_set_style_string(${ident}), "${toDashCase(
                    key
                  )}", "${value}");`;
                })
              );
              break;
            default:
              templateLines.push(
                `ui_widget_set_attr(${ident}, "${attrName}", "${attrs[attrName]}");`
              );
              break;
          }
        });
        if (node.text) {
          templateLines.push(
            `ui_widget_set_text(${ident}, ${createWidgetText(node.text)});`
          );
        }
        break;
    }
    if (Array.isArray(node.children)) {
      (await Promise.all(node.children.map(translateNode))).forEach(
        (childIdent) => {
          if (ident && childIdent && childIdent !== parentIdent) {
            templateLines.push(`ui_widget_append(${ident}, ${childIdent});`);
          }
        }
      );
    }
    return ident;
  }

  await translateNode(rootNode);
  return [
    `/** This file is generated from ${fileBase} */`,
    "",
    ...generateIncludings(),
    "",
    ...generateRefsType(),
    "",
    ...generateProtoFunc(),
    "",
    ...globalLines,
    "",
    ...generateTemplateFunc(),
    "",
    ...generateResourceFunc(),
  ].join("\n");
}

/** @type {Loader} */
export default async function UILoader(content) {
  /** @type {ResourceNode} */
  let node;

  if (typeof content === "string") {
    node = JSON.parse(content);
  } else if (content && "name" in content) {
    node = content;
  } else {
    throw new Error("invalid content");
  }
  return transform(node, this, {
    ...this.getOptions(),
    filePath: this.resourcePath,
  });
}
