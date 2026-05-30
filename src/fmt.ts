import {
  CType,
  ObjectBinding,
  Value,
  factory,
  getComponentContext,
  getFunctionContext,
  stringifyValue,
} from "./binding.js";

export default function fmt(...args: Value[]): ObjectBinding {
  const component = getComponentContext();
  const ctx = getFunctionContext();
  const str = factory.createStringVariable();
  const len = factory.createNumericVariable(
    `${str.__meta__.name}_len`,
    8,
    CType.Size
  );
  const list = args.map((value) => stringifyValue(value).__meta__.name);

  component.headerFiles.add('<stdlib.h>');
  component.headerFiles.add('<stdio.h>');
  component.headerFiles.add('<string.h>');
  ctx.body.push(...list.map((id) => `${len.__meta__.name} += strlen(${id})`));
  ctx.body.push(
    `${str.__meta__.name} = malloc(sizeof(char) * ${len.__meta__.name})`
  );
  ctx.body.push(
    ...list.map(
      (id, index) =>
        `${index === 0 ? `strcpy` : `strcat`}(${str.__meta__.name}, ${id})`
    )
  );
  return str;
}
