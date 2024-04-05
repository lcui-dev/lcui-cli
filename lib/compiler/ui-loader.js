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

/**
 * 编译资源结点树为 C 代码
 * @param {ResourceNode} rootNode
 * @param {LoaderContext} context
 * @param {UILoaderOptions} options
 * @returns {string}
 */
async function compile(rootNode, context, { filePath, indent = 8 }) {
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
  const refs = [];
  const globalLines = [];
  const resourceLines = [];
  const headerFiles = ["<ui.h>"];
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
        ...refs.map((ref) => `${indentStr}ui_widget_t *${ref};`),
        `} ${identPrefix}_refs_t;`,
        "",
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
        refs.length > 0 ? `, ${identPrefix}_refs_t *refs` : ""
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
    return Array.from(new Set(headerFiles))
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
    if (resourceLines.length < 1) {
      return [];
    }
    let identPrefix = toIdent(fileName);
    if (Object.keys(schemas).length == 1 && currentSchema.name) {
      identPrefix = toIdent(currentSchema.name);
    }
    return [
      `static void ${identPrefix}_load_resources(void)`,
      "{",
      ...resourceLines.map((line) => (line ? `${indentStr}${line}` : line)),
      "}",
      "",
    ].join("\n");
  }

  async function compileResourceNode(node) {
    const attrs = node.attributes || {};
    if (attrs.type === "text/c") {
      if (node.text) {
        globalLines.push(node.text);
      }
      return;
    }
    const asset = await context.importModule(attrs.src);
    headerFiles.push(...asset.metadata.headerFiles);
    resourceLines.push(asset.metadata.initCode);
  }

  async function compileSchemaNode(node) {
    currentSchema = createSchema();
    await Promise.all(
      node.children.map(async (child) => {
        switch (child.name) {
          case "name":
            currentSchema.name = child.text;
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
            await compileUINodeChildren(child, parentIdent);
            break;
          default:
            throw SyntaxError(`Unknown node: ${child.name}`);
        }
      })
    );
    if (!currentSchema.name) {
      throw SyntaxError("The schema has no name");
    }
    schemas[currentSchema.name] = currentSchema;
  }

  async function compileUINodeChildren(node, ident) {
    if (!Array.isArray(node.children)) {
      return;
    }
    (await Promise.all(node.children.map(compileUINode))).forEach(
      (childIdent) => {
        if (childIdent) {
          currentSchema.templateLines.push(
            `ui_widget_append(${ident}, ${childIdent});`
          );
        }
      }
    );
  }

  async function compileUINode(node) {
    let ident;
    let widgetType;
    const attrs = node.attributes || {};

    if (["w", "widget"].includes(node.name)) {
      widgetType = attrs.type;
    } else {
      widgetType = node.name;
    }
    if (
      currentSchema.template.children.length == 1 &&
      currentSchema.template.children[0] === node
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
      currentSchema.templateLines.push(
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
    compileUINodeChildren(node, ident);
    return ident;
  }

  function compileNode(node) {
    switch (node.name) {
      case "ui":
        if (state !== stateEnum.START) {
          throw SyntaxError("<ui> must be at the top level");
        }
        state = stateEnum.PARSE_UI;
        currentSchema.body = node;
        return compileUINodeChildren(node, parentIdent);
      case "lcui-app":
        break;
      case "resource":
        return compileResourceNode(node);
      case "schema":
        if (state !== stateEnum.START) {
          throw SyntaxError("<schema> must be at the top level");
        }
        state = stateEnum.PARSE_SCHEMA;
        return compileSchemaNode(node);
      default:
        throw SyntaxError(`Unknown node: ${node.name}`);
    }
    return Promise.all(node.children.map(compileNode));
  }

  await compileNode(rootNode);
  return [
    `/** This file is generated from ${fileBase} */`,
    generateIncluding(),
    "",
    globalLines.join("\n"),
    "",
    Object.values(schemas).map(compileSchema).join('\n'),
    generateResourceFunc(),
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
  return compile(node, this, {
    ...this.getOptions(),
    filePath: this.resourcePath,
  });
}
