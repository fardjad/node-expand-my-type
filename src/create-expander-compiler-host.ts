import ts from "typescript";

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

      const sourceText = [
        ...[
          "type __TYPE_EXPANDER_RESULT__ = __TYPE_EXPANDER_EXPAND__<__TYPE_EXPANDER_EXPRESSION__>;",
          `type __TYPE_EXPANDER_EXPRESSION__ = ${typeExpression};`,
          "type __TYPE_EXPANDER_EXPAND__<T> = {",
          "  [K in keyof T]: __TYPE_EXPANDER_EXPAND__<T[K]>;",
          "} & {};",
        ],
        sourceFile.getFullText(),
      ].join("\n");

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
