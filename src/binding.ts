export type Value = string | number | boolean | object | null | ObjectBinding;

export enum SyntaxKind {
  Unknown,
  StringLiteral,
  NumericLiteral,
  CallExpression,
  NewExpression,
}

export enum CType {
  Unknown,
  Int,
  Boolean,
  Size,
  Double,
  String,
  Object,
}

const cNumericTypes = [CType.Int, CType.Size, CType.Double] as const;
type CNumericType = (typeof cNumericTypes)[number];

interface Node {
  kind: SyntaxKind;
}

interface CallExpression extends Node {
  kind: SyntaxKind.CallExpression;
  identifier: string;
  arguments: Value[];
}

interface NewExpression extends Omit<CallExpression, "kind"> {
  kind: SyntaxKind.NewExpression;
}

interface StringLiteral extends Node {
  kind: SyntaxKind.StringLiteral;
  text: string;
}

interface NumericLiteral extends Node {
  kind: SyntaxKind.NumericLiteral;
  text: string;
  type: CNumericType;
}

type InitializerExpression =
  | NumericLiteral
  | StringLiteral
  | NewExpression
  | ObjectBinding;

interface VariableDeclaration {
  identifier: string;
  initializer: ObjectBinding;
}

export interface FunctionContext {
  kind: string;
  name: string;
  locals: VariableDeclaration[];
  body: string[];
  hasStateOperation: boolean;
}

interface EventHandlerDeclaration {
  eventName: string;
  target: string;
  handler: string | Function;
  context: FunctionContext;
}

export interface ComponentContext extends FunctionContext {
  kind: "ComponentContext";
  state: VariableDeclaration[];
  stateNames: string[];
  eventHandlers: EventHandlerDeclaration[];
  refs: string[];
  refNames: string[];
  headerFiles: Set<string>;
}

enum BindingKind {
  Object,
  Module,
}

interface ModuleBindingMeta {
  kind: BindingKind.Module;
  name: string;
  file: string;
}

interface ObjectBindingMeta {
  kind: BindingKind.Object;
  name: string;
  owner?: BindingBase;
  type: CType;
  keepAlive?: Boolean;
  initializer?: InitializerExpression;
}

type BindingMeta = ModuleBindingMeta | ObjectBindingMeta;

interface BindingBase<T = BindingMeta> {
  __meta__: T;
  (...arg: Value[]): Value;
  new (...arg: Value[]): Binding;
}

export type Binding<T = BindingMeta> = BindingBase<T> & {
  [key: string]: Binding;
};
export type ObjectBinding = Binding<ObjectBindingMeta>;

const typeNameMap: Partial<Record<CType, string>> = {
  [CType.Double]: "double",
  [CType.Size]: "size_t",
  [CType.Int]: "int",
  [CType.String]: "char*",
};

export function getObjectTypeName(obj: ObjectBinding) {
  const init = obj.__meta__.initializer;
  const typeName = typeNameMap[obj.__meta__.type];

  if (typeName) {
    return typeName;
  }
  if (!init) {
    throw new SyntaxError("missing initializer");
  }
  if (isObjectBinding(init)) {
    return init.__meta__.name;
  }
  switch (init.kind) {
    case SyntaxKind.NumericLiteral:
      return typeNameMap[init.type] || "unknown";
    case SyntaxKind.StringLiteral:
      return typeNameMap[CType.String] || "char*";
    case SyntaxKind.NewExpression:
      return init.identifier;
    default:
      break;
  }
  return "unknown";
}

export function getTypeName(value: Value) {
  if (isObjectBinding(value)) {
    return getObjectTypeName(value);
  }
  return typeof value;
}

export function toClassName(typeName: string) {
  return typeName.endsWith("_t")
    ? typeName.substring(0, typeName.length - 1)
    : typeName;
}

export function getInitializerName(typeName: string) {
  return `${toClassName(typeName)}_create`;
}

export function getDestroyerName(typeName: string) {
  return `${toClassName(typeName)}_destroy`;
}

function resolveBindingIdentify(b: ObjectBinding) {
  // TODO: 考虑 b.owner 存在的情况
  return b.__meta__.name || "unnamed_obj";
}

function compileCallExpression(identifier: string, args: Value[]) {
  const argsStr = args
    .map((arg) => {
      switch (typeof arg) {
        case "string":
          return JSON.stringify(arg);
        case "number":
        case "boolean":
          return `${arg}`;
        case "undefined":
          return "NULL";
        case "object":
          if (arg === null) {
            return "NULL";
          }
          if (isObjectBinding(arg)) {
            return resolveBindingIdentify(arg);
          }
        default:
          break;
      }
      return `unsupported_type_${typeof arg}`;
    })
    .join(", ");
  return `${identifier}(${argsStr})`;
}

function createStringBinding(name: string, value: string | null = null) {
  return createObjectBinding({
    name,
    type: CType.String,
    initializer: createStringLiteral(value),
  });
}

function createStringVariable(value: string | null = null) {
  const ctx = getFunctionContext();
  const identifier = `str_${ctx.locals.length}`;
  const binding = createStringBinding(identifier, value);

  ctx.locals.push({
    identifier,
    initializer: binding,
  });
  return binding;
}

function createNumericVariable(
  name: null | string = null,
  value: number = 0,
  type: CNumericType = CType.Int
) {
  const ctx = getFunctionContext();
  const identifier = name || `num_${ctx.locals.length}`;
  const binding = createNumericBinding(identifier, value, type);

  ctx.locals.push({
    identifier,
    initializer: binding,
  });
  return binding;
}

function createVariable(typeName: string, args: Value[] = []) {
  const ctx = getFunctionContext();
  const identifier = `obj_${ctx.locals.length}`;
  const binding = createObjectBinding({
    name: identifier,
    type: CType.Object,
    initializer: {
      kind: SyntaxKind.NewExpression,
      identifier: typeName,
      arguments: args,
    },
  });

  ctx.locals.push({
    identifier,
    initializer: binding,
  });
  return binding;
}

function compileObjectInitializer(obj: ObjectBinding) {
  const init = obj.__meta__.initializer;

  if (!init) {
    throw new SyntaxError("missing initializer");
  }
  switch (init.kind) {
    case SyntaxKind.StringLiteral:
      if (init.text === "NULL") {
        return "NULL";
      }
      return `strdup2(${init.text})`;
    case SyntaxKind.NumericLiteral:
      return init.text;
    case SyntaxKind.NewExpression:
      return `${compileCallExpression(
        getInitializerName(init.identifier),
        init.arguments
      )}`;
    default:
      break;
  }
  return "";
}

function compileVariableDeclaration(decl: VariableDeclaration) {
  return `${getObjectTypeName(decl.initializer)} ${
    decl.identifier
  } = ${compileObjectInitializer(decl.initializer)}`;
}

function compileObjectDestroyer(obj: ObjectBinding) {
  const init = obj.__meta__.initializer;

  if (obj.__meta__.keepAlive) {
    return "";
  }
  if (!init) {
    throw new SyntaxError("missing initializer");
  }
  switch (init.kind) {
    case SyntaxKind.StringLiteral:
      return `free(${obj.__meta__.name})`;
    case SyntaxKind.NumericLiteral:
      break;
    case SyntaxKind.NewExpression:
      return `${getDestroyerName(init.identifier)}(${obj.__meta__.name})`;
    default:
      break;
  }
  return "";
}

function formatFuncBody(body: string[]) {
  return body
    .filter(Boolean)
    .map((line) => `        ${line};`)
    .join("\n");
}

function compileFunction({
  locals,
  signature,
  body,
}: {
  locals: VariableDeclaration[];
  signature: string;
  body: string[];
}) {
  const indent = " ".repeat(8);
  return [
    signature,
    "{",
    formatFuncBody(locals.map((item) => compileVariableDeclaration(item))),
    formatFuncBody(body),
    formatFuncBody(locals.map((item) => compileObjectDestroyer(item.initializer))),
    "}",
  ]
    .filter(Boolean)
    .join("\n");
}

function compileComponentMethod({
  ctx,
  name,
  args = "",
  body,
  thatId = "w",
}: {
  ctx?: FunctionContext;
  thatId?: string;
  args?: string;
  name?: string;
  body?: string[];
}) {
  const className = getComponentContext().name;
  const methodBody = [
    `${className}_react_t *_that = ui_widget_get_data(${thatId}, ${className}_proto)`,
    ...(body || ctx?.body || []),
    ctx?.hasStateOperation ? `${className}_react_update(${thatId})` : undefined,
  ].filter((line): line is string => Boolean(line));
  return compileFunction({
    locals: ctx?.locals || [],
    signature: `static void ${className}_${
      name || ctx?.name || "unnamed_func"
    }(ui_widget_t *w${args})`,
    body: methodBody,
  });
}

function compileComponentState(ctx: ComponentContext) {
  return [
    compileComponentMethod({
      name: "react_init_state",
      body: ctx.state.map(
        (item) =>
          `${
            item.initializer.__meta__.name
          } = ${compiler.compileObjectInitializer(item.initializer)}`
      ),
    }),
    "",
    compileComponentMethod({
      name: "react_destroy_state",
      body: ctx.state.map((item) =>
        compiler.compileObjectDestroyer(item.initializer)
      ),
    }),
  ].join("\n");
}

function compileComponentEventHandlers(ctx: ComponentContext) {
  return [
    ...ctx.eventHandlers.map((item) => {
      if (typeof item.handler === "string") {
        return `static void ${item.handler}(ui_widget_t *w, ui_event_t *e, void *arg);`;
      }
      return compileComponentMethod({
        ctx: item.context,
        args: ", ui_event_t *e, void *arg",
        thatId: "e->data",
      });
    }),
    compileComponentMethod({
      name: "react_init_events",
      body: ctx.eventHandlers.map(
        (item) =>
          `ui_widget_on(${item.target}, "${item.eventName}", ${
            typeof item.handler === "string"
              ? item.handler
              : `${ctx.name}_${item.context.name}`
          }, w)`
      ),
    }),
  ].join("\n\n");
}

function compileTypes(ctx: ComponentContext) {
  const lines = [];

  lines.push(
    `typedef struct ${ctx.name}_react_state {`,
    ...(ctx.state.length > 0
      ? ctx.state.map(
          (item) =>
            `        ${getObjectTypeName(item.initializer)} ${item.identifier};`
        )
      : ["        char empty;"]),
    `} ${ctx.name}_react_state_t;`,
    "",
    `typedef struct ${ctx.name}_react {`,
    `        ${ctx.name}_react_state_t state;`
  );
  if (ctx.refs.length > 0) {
    lines.push(`        ${ctx.name}_refs_t refs;`);
  }
  lines.push(`} ${ctx.name}_react_t;`);
  return lines.join("\n");
}

function compileComponent(ctx: ComponentContext) {
  const hasState = ctx.state.length > 0;
  const hasEvents = ctx.eventHandlers.length > 0;
  return [
    hasState && compileComponentState(ctx),
    compileComponentMethod({ ctx, name: "react_update" }),
    hasEvents && compileComponentEventHandlers(ctx),
    [
      `static void ${ctx.name}_react_init(ui_widget_t *w)`,
      "{",
      `        ${ctx.name}_react_t *_that = ui_widget_get_data(w, ${ctx.name}_proto);`,
      `        ${ctx.name}_load_template(w${
        ctx.refs.length > 0 ? ", &_that->refs" : ""
      });`,
      hasState && `        ${ctx.name}_react_init_state(w);`,
      hasEvents && `        ${ctx.name}_react_init_events(w);`,
      hasState && `        ${ctx.name}_react_update(w);`,
      "}\n",
      `static void ${ctx.name}_react_destroy(ui_widget_t *w)`,
      "{",
      hasState && `        ${ctx.name}_react_destroy_state(w);`,
      "}",
    ]
      .filter(Boolean)
      .join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");
}

let contextList: FunctionContext[] = [];

export function getFunctionContext() {
  if (contextList.length < 1) {
    throw new SyntaxError("FunctionContext is missing");
  }
  return contextList[contextList.length - 1];
}

export function getComponentContext() {
  if (contextList[0]?.kind !== "ComponentContext") {
    throw new SyntaxError(
      "The createState function must be called in a component function"
    );
  }
  return contextList[0] as ComponentContext;
}

export function pushFunctionComponent(ctx: FunctionContext) {
  contextList.push(ctx);
}

export function popFunctionComponent() {
  contextList.pop();
}

export function setComponentContext(ctx: ComponentContext) {
  contextList = [ctx];
}

function createNumericLiteral(num: number, type: CNumericType): NumericLiteral {
  return {
    kind: SyntaxKind.NumericLiteral,
    text: `${num}`,
    type,
  };
}

function createStringLiteral(value: string | null = null): StringLiteral {
  return {
    kind: SyntaxKind.StringLiteral,
    text: value === null ? "NULL" : JSON.stringify(value),
  };
}

function createBinding<T extends object>(
  meta: BindingMeta,
  data: T = {} as T
) {
  const binding = new Proxy(
    { __meta__: meta, ...data } as Record<string | symbol, unknown>,
    {
      get(target, p, receiver) {
        if (p in target) {
          return Reflect.get(target, p, receiver);
        }
        if (typeof p !== "string") {
          return null;
        }
        return createBinding({
          kind: BindingKind.Object,
          owner: receiver,
          type: CType.Object,
          name: p,
        });
      },
      construct(target: { __meta__: BindingMeta }, args) {
        if (target.__meta__.kind !== BindingKind.Object) {
          throw new SyntaxError("Module cannot be used as a constructor");
        }
        if (!meta.name) {
          throw new SyntaxError("Constructor has no name");
        }
        return createVariable(meta.name, args);
      },
      apply(target: { __meta__: BindingMeta }, _thisArg, args) {
        if (target.__meta__.kind === BindingKind.Module) {
          throw new SyntaxError("Module cannot be used as a function");
        }
        const ctx = getFunctionContext();
        ctx.body.push(
          compileCallExpression(
            resolveBindingIdentify(target as unknown as ObjectBinding),
            args
          )
        );
        return undefined;
      },
    }
  ) as unknown as Binding & T;
  return binding;
}

function createObjectBinding<T extends object = {}>(
  meta: Omit<ObjectBindingMeta, "kind">,
  data: T = {} as T
): ObjectBinding & T {
  return createBinding(
    { ...meta, kind: BindingKind.Object },
    data
  ) as ObjectBinding & T;
}

export function isObjectBinding(val: any): val is ObjectBinding {
  return typeof val === "object" && "__meta__" in val;
}

function stringifyBinding(obj: ObjectBinding) {
  const ctx = getFunctionContext();
  switch (obj.__meta__.type) {
    case CType.String:
      return obj;
    case CType.Object: {
      const typeName = getObjectTypeName(obj);
      const str = createStringVariable();
      ctx.body.push(
        `${str.__meta__.name} = ${toClassName(typeName)}_to_string(${
          obj.__meta__.name
        })`
      );
    }
    case CType.Double: {
      const str = createStringVariable();
      ctx.body.push(
        `${str.__meta__.name} = malloc(sizeof(char) * 32)`,
        `snprintf(${str.__meta__.name}, 31, "%lf", ${obj.__meta__.name})`,
        `${str.__meta__.name}[31] = 0`
      );
      return str;
    }
    case CType.Int: {
      const str = createStringVariable();
      ctx.body.push(
        `${str.__meta__.name} = malloc(sizeof(char) * 32)`,
        `snprintf(${str.__meta__.name}, 31, "%d", ${obj.__meta__.name})`,
        `${str.__meta__.name}[31] = 0`
      );
      return str;
    }
    case CType.Size: {
      const str = createStringVariable();
      ctx.body.push(
        `${str.__meta__.name} = malloc(sizeof(char) * 32)`,
        `snprintf(${str.__meta__.name}, 31, "%zu", ${obj.__meta__.name})`,
        `${str.__meta__.name}[31] = 0`
      );
      return str;
    }
    default:
      break;
  }
  throw SyntaxError(
    `Unable to convert object ${obj.__meta__.name} to a string`
  );
}

export function stringifyValue(value: Value) {
  switch (typeof value) {
    case "string":
      return createStringVariable(value);
    case "boolean":
    case "number":
      return createStringVariable(`${value}`);
    case "undefined":
      return createStringVariable("undefined");
    case "object":
      if (value === null) {
        return createStringVariable();
      }
      if (isObjectBinding(value)) {
        return stringifyBinding(value);
      }
    default:
      break;
  }
  throw SyntaxError(`Unable to convert ${typeof value} to a string`);
}

export function isNumericType(t: CType): t is CNumericType {
  return cNumericTypes.includes(t as CNumericType);
}

export function isNumeric(obj: ObjectBinding) {
  return isNumericType(obj.__meta__.type);
}

export function isString(obj: ObjectBinding) {
  return obj.__meta__.type === CType.String;
}

function createBooleanBinding(name: string) {
  return createObjectBinding({ name, type: CType.Boolean });
}

function createNumericBinding(
  name: string,
  value: number,
  type: CNumericType = CType.Int
) {
  return createObjectBinding({
    name,
    type,
    initializer: createNumericLiteral(value, type),
  });
}

export function createFunctionContext(name: string): FunctionContext {
  return {
    kind: "FunctionContext",
    name,
    hasStateOperation: false,
    locals: [],
    body: [],
  };
}

export function call(func: Function, ctx: FunctionContext) {
  contextList.push(ctx);
  func();
  contextList.pop();
}

export const compiler = {
  compileTypes,
  compileVariableDeclaration,
  compileObjectInitializer,
  compileObjectDestroyer,
  compileFunction,
  compileComponentState,
  compileComponentEventHandlers,
  compileComponentMethod,
  compileComponent,
};

export const factory = {
  createObjectBinding,
  createStringBinding,
  createBooleanBinding,
  createNumericBinding,
  createNumericVariable,
  createStringVariable,
  createVariable,
};
