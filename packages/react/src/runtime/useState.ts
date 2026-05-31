import {
  CType,
  ObjectBinding,
  Value,
  getTypeName,
  isNumeric,
  isObjectBinding,
  isString,
  stringifyValue,
  getComponentContext,
  getFunctionContext,
  factory,
  compiler,
  isNumericType,
} from "./binding.js";

function setObjectBindingValue(obj: ObjectBinding, newValue: Value) {
  const ctx = getFunctionContext();

  ctx.hasStateOperation = true;
  if (isString(obj)) {
    const str = stringifyValue(newValue);
    ctx.body.push(
      compiler.compileObjectDestroyer(obj),
      `${obj.__meta__.name} = ${str.__meta__.name}`
    );
    return;
  }
  if (isNumeric(obj)) {
    let right: string;

    switch (typeof newValue) {
      case "boolean":
        right = newValue ? "1" : "0";
        break;
      case "number":
        right = `${newValue}`;
        break;
      case "object":
        if (newValue === null) {
          right = "0";
          break;
        }
        if (isObjectBinding(newValue)) {
          right = newValue.__meta__.name;
          break;
        }
      default:
        throw SyntaxError(`Unable to convert ${typeof newValue} to int`);
    }
    ctx.body.push(`${obj.__meta__.name} = ${right}`);
    return;
  }
  throw new SyntaxError(
    `Cannot assign value because type ${getTypeName(
      newValue
    )} is incompatible with type ${getTypeName(obj)}`
  );
}

export default function useState(initialValue: Value, valueType?: CType) {
  let value: ObjectBinding;
  const ctx = getComponentContext();
  const stateName =
    ctx.stateNames[ctx.state.length] || `unnamed_state_${ctx.state.length}`;
  const stateCName = `_that->state.${stateName}`;

  if (isObjectBinding(initialValue)) {
    value = initialValue;
    ctx.locals = ctx.locals.filter(
      (local) => local.initializer !== initialValue
    );
    ctx.body = ctx.body.filter((line) => !line.startsWith(value.__meta__.name));
    value.__meta__.name = stateCName;
  } else {
    switch (typeof initialValue) {
      case "boolean":
        value = factory.createObjectBinding({
          name: stateCName,
          type: CType.Boolean,
        });
        break;
      case "string":
        value = factory.createStringBinding(stateCName, initialValue);
        break;
      case "number":
        if (valueType !== undefined && isNumericType(valueType)) {
          value = factory.createNumericBinding(
            stateCName,
            initialValue,
            valueType
          );
          break;
        }
        throw new SyntaxError(`Unsupported numeric CType: ${valueType}`);
      default:
        throw new SyntaxError(`Unsupported type: ${typeof initialValue}`);
    }
  }
  ctx.state.push({ identifier: stateName, initializer: value });
  return [
    value,
    (newValue: Value) => setObjectBindingValue(value, newValue),
  ] as const;
}
