import type { Options as PrettierOptions } from "prettier";
import { format } from "prettier";

const identifierPrefix = "__EXPAND_MY_TYPE__";

export const createExpandCodeBlock = (typeExpression: string) => {
  // https://github.com/microsoft/TypeScript/blob/main/tests/cases/compiler/computedTypesKeyofNoIndexSignatureType.ts
  return `type ${identifierPrefix}Result = ${identifierPrefix}Expand<${identifierPrefix}Expression>;
    type ${identifierPrefix}Expression = ${typeExpression};

    type ${identifierPrefix}Expand<T> = 
        T extends (...args: infer A) => infer R ? (...args: ${identifierPrefix}Expand<A>) => ${identifierPrefix}Expand<R>
      : T extends Promise<infer U> ? Promise<${identifierPrefix}ExpandTypeArgument<U>>
      : { [K in keyof T]: T[K] extends string ? ${identifierPrefix}ExpandString<T[K]> : ${identifierPrefix}Expand<T[K]>; } & {};

    type ${identifierPrefix}ExpandTypeArgument<T> = [T & {}] extends [never] ? T : T & {} extends void ? T : ${identifierPrefix}Expand<T & {}>;

    // Forces a union of string literal types to be expanded
    type ${identifierPrefix}ExpandString<T extends string> = ${identifierPrefix}RemoveUnderscore<${identifierPrefix}AppendUnderscore<T>>;
    type ${identifierPrefix}AppendUnderscore<T extends string> = \`\${T}_\` extends string ? \`\${T}_\` : never;
    type ${identifierPrefix}RemoveUnderscore<T extends string> = T extends \`\${infer U}_\` ? U : never;`;
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
