import type { Options as PrettierOptions } from "prettier";
import { format } from "prettier";

const identifierPrefix = "__EXPAND_MY_TYPE__";

export const createExpandCodeBlock = (typeExpression: string) => {
  // https://github.com/microsoft/TypeScript/blob/main/tests/cases/compiler/computedTypesKeyofNoIndexSignatureType.ts
  return `type ${identifierPrefix}Result = ${identifierPrefix}Expand<${identifierPrefix}Expression>;
    type ${identifierPrefix}Expression = ${typeExpression};

    type ${identifierPrefix}Expand<T> = T extends (...args: infer A) => infer R
      ? (...args: ${identifierPrefix}Expand<A>) => ${identifierPrefix}Expand<R>
      : { [K in keyof T]: ${identifierPrefix}Expand<T[K]>; } & {};`;
};

export const createSimpleTypeAlias = (typeExpression: string) => {
  return `type ${identifierPrefix}Result = ${typeExpression};`;
};

export const formatTypeExpression = async (
  code: string,
  prettierOptions?: PrettierOptions,
) => {
  return (
    await format(
      `type ${identifierPrefix} = ${code}`,
      prettierOptions ?? {
        parser: "typescript",
        semi: false,
      },
    )
  )
    .trim()
    .substring(`type ${identifierPrefix} = `.length);
};
