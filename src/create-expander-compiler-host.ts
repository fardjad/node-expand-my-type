import ts from "typescript";

const identifierPrefix = "__TYPE_EXPANDER__";

/**
 * Creates a custom compiler host that augments the specified source file for expanding a type expression.
 *
 * @param sourceFileName Name of the source file to augment.
 * @param typeExpression Type expression.
 * @param compilerOptions TypeScript compiler options.
 * @param getSourceFileFunction The implementation of the `ts.CompilerHost["getSourceFile"]` function.
 * @returns A custom compiler host that returns an augmented source file that can be used to expand the type expression.
 */
export const createExpanderCompilerHost = (
  sourceFileName: string,
  typeExpression: string,
  compilerOptions?: ts.CompilerOptions,
  getSourceFileFunction?: ts.CompilerHost["getSourceFile"],
) => {
  const customCompilerHost = ts.createCompilerHost(compilerOptions ?? {});
  const originalGetSourceFile = customCompilerHost.getSourceFile;

  customCompilerHost.getSourceFile = (fileName, ...args) => {
    if (fileName === sourceFileName) {
      const sourceFile = (getSourceFileFunction ?? originalGetSourceFile)(
        fileName,
        ...args,
      );

      if (sourceFile === undefined) {
        return undefined;
      }

      // https://github.com/microsoft/TypeScript/blob/main/tests/cases/compiler/computedTypesKeyofNoIndexSignatureType.ts
      const sourceText = `type ${identifierPrefix}Result = ${identifierPrefix}Expand<${identifierPrefix}Expression>;
        type ${identifierPrefix}Expression = ${typeExpression};

        type ${identifierPrefix}Expand<T> = T extends (...args: infer A) => infer R
          ? (...args: ${identifierPrefix}Expand<A>) => ${identifierPrefix}Expand<R>
          : { [K in keyof T]: ${identifierPrefix}Expand<T[K]>; } & {};
          
        ${sourceFile.getFullText()}`;

      return ts.createSourceFile(
        fileName,
        sourceText,
        sourceFile.languageVersion,
        true,
      );
    }

    return originalGetSourceFile(fileName, ...args);
  };

  return customCompilerHost;
};
