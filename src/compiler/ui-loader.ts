import path from "path";
import { getResourceLoaderName, toIdent } from "../utils.js";
import {
  LoaderContext,
  LoaderInput,
  ResourceNode,
  UILoaderOptions,
} from "../types.js";

function toSnakeCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function toDashCase(str) {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

function createSchema() {
  return {
    name: "",
    refs: [],
    code: "",
    typesCode: "",
    template: null,
    templateLines: [],
  };
}

/** 编译资源结点树为 C 代码 */
async function compile(
  rootNode: ResourceNode,
  context: LoaderContext,
  { filePath, indent = 8 }: UILoaderOptions
) {
  let count = 0;
  let globalIdentCount = 0;
  const stateEnum = {
    START: 0,
    PARSE_UI: 1,
    PARSE_SCHEMA: 2,
  };
  let state = stateEnum.START;
  let currentSchema = createSchema();
  let schemas = {};

  const { name: fileName, base: fileBase } = path.parse(filePath);
  const globalLines = [];
  const resourceLines = [];
  const assets = [];
  const headerFiles = new Set(["<ui.h>"]);
  const indentStr = " ".repeat(indent);
  const parentIdent = "parent";

  function allocTextVar(str) {
    const ident = `widget_text_${globalIdentCount++}`;
    const numArrStr = Array.from(Buffer.from(str, "utf-8"))
      .map((ch) => `0x${ch.toString(16)}`)
      .join(", ");
    globalLines.push(
      `// UTF-8 encoded string from: ${encodeURIComponent(str)}`,
      `static const unsigned char ${ident}[] = {${numArrStr}, 0};`
    );
    return ident;
  }
  function compileSchema(schema) {
    const identPrefix = toIdent(schema.name);
    const lines = [];

    if (schema.refs.length > 0) {
      lines.push(
        "typedef struct {",
        ...Array.from(new Set(schema.refs)).map(
          (ref) => `${indentStr}ui_widget_t *${ref};`
        ),
        `} ${identPrefix}_refs_t;`,
        ""
      );
    }
    if (currentSchema.typesCode) {
      lines.push(currentSchema.typesCode, "");
    }
    if (schema.name) {
      let baseType = "NULL";
      const protoIdent = `${identPrefix}_proto`;

      if (schema.template.children.length === 1) {
        baseType = schema.template.children[0].name;
        if (baseType === "w" || baseType === "widget") {
          baseType = "NULL";
        } else {
          baseType = `"${baseType}"`;
        }
      }
      lines.push(
        `static ui_widget_prototype_t *${protoIdent};\n`,
        `static void ${identPrefix}_init_prototype(void)`,
        "{",
        `${indentStr}${protoIdent} = ui_create_widget_prototype("${schema.name}", ${baseType});`,
        "}\n"
      );
    }
    lines.push(
      `static void ${identPrefix}_load_template(ui_widget_t *parent${
        schema.refs.length > 0 ? `, ${identPrefix}_refs_t *refs` : ""
      })`,
      "{",
      ...(count > 0 ? [`${indentStr}ui_widget_t *w[${count}];\n`] : []),
      ...schema.templateLines.map((line) =>
        line ? `${indentStr}${line}` : line
      ),
      "}",
      ""
    );
    if (currentSchema.code) {
      lines.push(currentSchema.code, "");
    }
    return lines.join("\n");
  }

  function generateIncluding() {
    return Array.from(headerFiles)
      .map((file) => {
        let filePath = file;
        if (filePath.startsWith('"')) {
          filePath = `"${path
            .relative(context.context, filePath.substring(1, file.length - 1))
            .replace(/\\/g, "/")}"`;
        }
        return `#include ${filePath}`;
      })
      .join("\n");
  }

  function generateResourceFunc() {
    return [
      `void ${getResourceLoaderName(
        fileName,
        Object.keys(schemas).length === 1 && currentSchema.name
      )}(void)`,
      "{",
      ...resourceLines.map((line) => (line ? `${indentStr}${line}` : line)),
      "}",
      "",
    ].join("\n");
  }

  function compileResourceNode(node) {
    const attrs = node.attributes || {};
    if (attrs.type === "text/c") {
      if (node.text) {
        globalLines.push(node.text);
      }
      return;
    }
    assets.push(attrs.src);
  }

  function compileSchemaNode(node) {
    currentSchema = createSchema();
    node.children.forEach((child) => {
      switch (child.name) {
        case "name":
          currentSchema.name = child.text;
          break;
        case "include":
          headerFiles.add(child.text);
          break;
        case "ref":
          currentSchema.refs.push(child.text);
          break;
        case "code":
          if (child.attributes?.kind === "types") {
            currentSchema.typesCode += child.text;
          } else {
            currentSchema.code += child.text;
          }
          break;
        case "template":
          currentSchema.template = child;
          compileUINode(child);
          break;
        default:
          throw SyntaxError(`Unknown node: ${child.name}`);
      }
    });
    if (!currentSchema.name) {
      throw SyntaxError("The schema has no name");
    }
    schemas[currentSchema.name] = currentSchema;
  }

  function compileWidgetNodeChildren(node, ident) {
    if (!Array.isArray(node.children)) {
      return;
    }
    const identList = node.children.map((node) => {
      const childIdent = allocWidgetNodeIdent(node);
      compileWidgetNode(node, childIdent);
      return childIdent;
    });
    identList.forEach((childIdent) => {
      currentSchema.templateLines.push(
        `ui_widget_append(${ident}, ${childIdent});`
      );
    });
  }

  function allocWidgetNodeIdent(node: ResourceNode) {
    let ident = "";
    const attrs = node.attributes || {};
    const widgetType = ["w", "widget"].includes(node.name)
      ? attrs.type
      : node.name;

    if (attrs.ref && typeof attrs.ref === "string") {
      ident = toIdent(attrs.ref);
      currentSchema.refs.push(ident);
      ident = `refs->${ident}`;
    } else {
      ident = `w[${count++}]`;
    }
    currentSchema.templateLines.push(
      `${ident} = ui_create_widget(${widgetType ? `"${widgetType}"` : "NULL"});`
    );
    return ident;
  }

  function compileUINode(node) {
    return compileWidgetNode(
      node.children.length == 1 ? node.children[0] : node,
      parentIdent
    );
  }

  function compileWidgetNode(node: ResourceNode, ident: string) {
    const attrs = node.attributes || {};

    Object.keys(attrs).forEach((attrName) => {
      switch (attrName) {
        case "ref":
          break;
        case "class":
          currentSchema.templateLines.push(
            `ui_widget_add_class(${ident}, "${attrs[attrName]}");`
          );
          return;
        case "style":
          currentSchema.templateLines.push(
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
          currentSchema.templateLines.push(
            `ui_widget_set_attr(${ident}, "${attrName}", "${attrs[attrName]}");`
          );
          break;
      }
    });
    if (node.text) {
      currentSchema.templateLines.push(
        `ui_widget_set_text(${ident}, (const char*)${allocTextVar(node.text)});`
      );
    }
    compileWidgetNodeChildren(node, ident);
  }

  function compileNode(node: ResourceNode) {
    switch (node.name) {
      case "ui":
        if (state !== stateEnum.START) {
          throw SyntaxError("<ui> must be at the top level");
        }
        state = stateEnum.PARSE_UI;
        compileUINode(node);
        state = stateEnum.START;
        return;
      case "lcui-app":
        break;
      case "resource":
        return compileResourceNode(node);
      case "schema":
        if (state !== stateEnum.START) {
          throw SyntaxError(`<schema> must be at the top level`);
        }
        state = stateEnum.PARSE_SCHEMA;
        compileSchemaNode(node);
        state = stateEnum.START;
        return;
      default:
        throw SyntaxError(`Unknown node: ${node.name}`);
    }
    node.children.forEach(compileNode);
  }

  compileNode(rootNode);
  (
    await Promise.all(assets.map((asset) => context.importModule(asset)))
  ).forEach((asset) => {
    asset.metadata.headerFiles.forEach((file) => headerFiles.add(file));
    resourceLines.push(asset.metadata.initCode);
  });
  return [
    `/** This file is generated from ${fileBase} */`,
    generateIncluding(),
    "",
    globalLines.join("\n"),
    "",
    Object.values(schemas).map(compileSchema).join("\n"),
    generateResourceFunc(),
  ].join("\n");
}

export default async function UILoader(
  this: LoaderContext,
  content: LoaderInput
) {
  let node: ResourceNode | undefined;

  if (typeof content === "string") {
    node = JSON.parse(content);
  } else if (content && "name" in content) {
    node = content;
  } else {
    throw new Error("invalid content");
  }
  return compile(node, this, {
    ...this.getOptions(),
    filePath: this.resourcePath,
  });
}
