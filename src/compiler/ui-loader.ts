import path from "path";
import { getResourceLoaderName, toIdent } from "../utils.js";
import { Loader, LoaderContext, LoaderInput, ResourceNode, UILoaderOptions } from "../types.js";

function toSnakeCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function toDashCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

interface Schema {
  name: string;
  refs: string[];
  code: string;
  typesCode: string;
  template: ResourceNode | null;
  templateLines: string[];
}

function createSchema(): Schema {
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
  const schemas: Record<string, Schema> = {};

  const { name: fileName, base: fileBase } = path.parse(filePath);
  const globalLines: string[] = [];
  const resourceLines: string[] = [];
  const assets: string[] = [];
  const headerFiles = new Set<string>(["<ui.h>"]);
  const indentStr = " ".repeat(indent);
  const parentIdent = "parent";

  function allocTextVar(str: string): string {
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
  function compileSchema(schema: Schema): string {
    const identPrefix = toIdent(schema.name);
    const lines: string[] = [];

    if (schema.refs.length > 0) {
      lines.push(
        "typedef struct {",
        ...Array.from(new Set(schema.refs)).map((ref) => `${indentStr}ui_widget_t *${ref};`),
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

      if (!schema.template) {
        throw new SyntaxError(`Schema "${schema.name}" has no <template>`);
      }
      if (schema.template.children && schema.template.children.length === 1) {
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
      ...schema.templateLines.map((line) => (line ? `${indentStr}${line}` : line)),
      "}",
      ""
    );
    if (currentSchema.code) {
      lines.push(currentSchema.code, "");
    }
    return lines.join("\n");
  }

  function generateIncluding(): string {
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

  function generateResourceFunc(): string {
    const onlySchemaName =
      Object.keys(schemas).length === 1 && currentSchema.name ? currentSchema.name : undefined;
    return [
      `void ${getResourceLoaderName(fileName, onlySchemaName)}(void)`,
      "{",
      ...resourceLines.map((line) => (line ? `${indentStr}${line}` : line)),
      "}",
      "",
    ].join("\n");
  }

  function compileResourceNode(node: ResourceNode): void {
    const attrs = (node.attributes || {}) as Record<string, unknown>;
    if (attrs.type === "text/c") {
      if (node.text) {
        globalLines.push(node.text);
      }
      return;
    }
    if (typeof attrs.src === "string") {
      assets.push(attrs.src);
    }
  }

  function compileSchemaNode(node: ResourceNode): void {
    currentSchema = createSchema();
    (node.children ?? []).forEach((child) => {
      switch (child.name) {
        case "name":
          currentSchema.name = child.text ?? "";
          break;
        case "include":
          if (child.text) {
            headerFiles.add(child.text);
          }
          break;
        case "ref":
          if (child.text) {
            currentSchema.refs.push(child.text);
          }
          break;
        case "code":
          if ((child.attributes as Record<string, unknown> | undefined)?.kind === "types") {
            currentSchema.typesCode += child.text ?? "";
          } else {
            currentSchema.code += child.text ?? "";
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

  function compileWidgetNodeChildren(node: ResourceNode, ident: string): void {
    if (!Array.isArray(node.children)) {
      return;
    }
    const identList = node.children.map((child) => {
      const childIdent = allocWidgetNodeIdent(child);
      compileWidgetNode(child, childIdent);
      return childIdent;
    });
    identList.forEach((childIdent) => {
      currentSchema.templateLines.push(`ui_widget_append(${ident}, ${childIdent});`);
    });
  }

  function allocWidgetNodeIdent(node: ResourceNode): string {
    let ident = "";
    const attrs = (node.attributes || {}) as Record<string, unknown>;
    const widgetType = ["w", "widget"].includes(node.name) ? attrs.type : node.name;

    if (attrs.ref && typeof attrs.ref === "string") {
      ident = toIdent(attrs.ref);
      currentSchema.refs.push(ident);
      ident = `refs->${ident}`;
    } else {
      ident = `w[${count++}]`;
    }
    currentSchema.templateLines.push(
      `${ident} = ui_create_widget(${widgetType ? `"${String(widgetType)}"` : "NULL"});`
    );
    return ident;
  }

  function compileUINode(node: ResourceNode): void {
    const children = node.children ?? [];
    compileWidgetNode(children.length === 1 ? children[0] : node, parentIdent);
  }

  function compileWidgetNode(node: ResourceNode, ident: string): void {
    const attrs = (node.attributes || {}) as Record<string, unknown>;

    Object.keys(attrs).forEach((attrName) => {
      switch (attrName) {
        case "ref":
          break;
        case "class":
          currentSchema.templateLines.push(
            `ui_widget_add_class(${ident}, "${String(attrs[attrName])}");`
          );
          return;
        case "style": {
          const styleObj = attrs.style;
          if (styleObj && typeof styleObj === "object") {
            currentSchema.templateLines.push(
              ...Object.entries(styleObj as Record<string, unknown>).map(([key, value]) => {
                if (typeof value === "number") {
                  return `ui_widget_set_style_unit_value(${ident}, css_prop_${toSnakeCase(
                    key
                  )}, ${value}, CSS_UNIT_PX);`;
                }
                return `ui_widget_set_style_string(${ident}), "${toDashCase(
                  key
                )}", ${JSON.stringify(value)});`;
              })
            );
          }
          break;
        }
        default:
          currentSchema.templateLines.push(
            `ui_widget_set_attr(${ident}, "${attrName}", "${String(attrs[attrName])}");`
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

  function compileNode(node: ResourceNode): void {
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
        compileResourceNode(node);
        return;
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
    (node.children ?? []).forEach(compileNode);
  }

  compileNode(rootNode);
  const importedAssets = await Promise.all(assets.map((asset) => context.importModule(asset)));
  importedAssets.forEach((asset) => {
    if (!asset) {
      return;
    }
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

const UILoader: Loader<LoaderInput, string> = async function UILoader(
  this: LoaderContext,
  content
) {
  let node: ResourceNode;

  if (typeof content === "string") {
    node = JSON.parse(content) as ResourceNode;
  } else if (content && typeof content === "object" && "name" in content) {
    node = content as ResourceNode;
  } else {
    throw new Error("invalid content");
  }
  return compile(node, this, {
    ...this.getOptions<UILoaderOptions>(),
    filePath: this.resourcePath,
  });
};

export default UILoader;
