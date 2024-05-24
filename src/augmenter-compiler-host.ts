import ts from "typescript";

type ExtractFunctions<T, K extends keyof T = keyof T> = {
  [P in K]: T[P] extends (...args: any[]) => any ? T[P] : never;
};
export type CompilerHostFunctionOverrides = Partial<
  ExtractFunctions<ts.CompilerHost>
>;

/**
 * Creates a custom compiler host that augments the specified source file for expanding a type expression.
 *
 * @param sourceFileName Name of the source file to augment.
 * @param codeToAdd Type expression.
 * @param compilerOptions TypeScript compiler options.
 * @param readFileFunction
 * @returns A custom compiler host that returns an augmented source file that can be used to expand the type expression.
 */
export const createAugmenterCompilerHost = (
  sourceFileName: string,
  codeToAdd: string,
  compilerOptions?: ts.CompilerOptions,
  compilerHostFunctionOverrides?: CompilerHostFunctionOverrides,
) => {
  const customCompilerHost = ts.createCompilerHost(compilerOptions ?? {}, true);
  for (const key of Object.keys(compilerHostFunctionOverrides ?? {})) {
    customCompilerHost[key] = compilerHostFunctionOverrides![key];
  }

  const originalReadFile = customCompilerHost.readFile;

  customCompilerHost.readFile = (fileName) => {
    const contents = originalReadFile(fileName);

    if (contents === undefined) {
      return contents;
    }

    if (fileName !== sourceFileName) {
      return contents;
    }

    return `${codeToAdd}\n${contents}`;
  };

  return customCompilerHost;
};
