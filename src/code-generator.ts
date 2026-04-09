import { Biome } from "@biomejs/js-api/nodejs";
import type { Configuration as BiomeConfiguration } from "@biomejs/wasm-nodejs";

const identifierPrefix = "__EXPAND_MY_TYPE__";
const virtualFormatFileName = "expand-my-type.ts";
const biome = new Biome();
const { projectKey } = biome.openProject();

const defaultBiomeConfiguration: BiomeConfiguration = {
  formatter: {
    enabled: true,
    indentStyle: "space",
  },
  javascript: {
    formatter: {
      quoteStyle: "double",
      semicolons: "asNeeded",
    },
  },
};

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
  biomeConfiguration?: BiomeConfiguration,
) => {
  const input = `type ${identifierPrefix} = ${code}`;
  const javascriptFormatter = {
    ...defaultBiomeConfiguration.javascript?.formatter,
    ...biomeConfiguration?.javascript?.formatter,
  };

  biome.applyConfiguration(projectKey, {
    ...defaultBiomeConfiguration,
    ...biomeConfiguration,
    formatter: {
      ...defaultBiomeConfiguration.formatter,
      ...biomeConfiguration?.formatter,
    },
    javascript: {
      ...defaultBiomeConfiguration.javascript,
      ...biomeConfiguration?.javascript,
      formatter: javascriptFormatter,
    },
  });

  const result = biome.formatContent(projectKey, input, {
    filePath: virtualFormatFileName,
  });

  if (result.diagnostics.length > 0) {
    throw new Error(
      biome.printDiagnostics(result.diagnostics, {
        filePath: virtualFormatFileName,
        fileSource: input,
      }),
    );
  }

  return result.content.trim().substring(`type ${identifierPrefix} = `.length);
};
