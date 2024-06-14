import { createAugmenterCompilerHost } from "./augmenter-compiler-host.ts";
import { type CompilerHostFunctionOverrides } from "./augmenter-compiler-host.ts";
import {
  createExpandCodeBlock,
  formatTypeExpression,
} from "./code-generator.ts";
import path from "node:path";
import type { Options as PrettierOptions } from "prettier";
import ts from "typescript";

/**
 * Finds the result type identifier node.
 *
 * @param node Node in which type type should be searched.
 * @returns The result type identifier node.
 */
const findResultIdentifierNode = (node: ts.Node): ts.Node | undefined => {
  if (node.getChildCount() == 0) {
    if (!ts.isIdentifier(node)) {
      return undefined;
    }

    // Since we put the __<IDENTIFIER>__ type at the beginning of the
    // file, we can return the first identifier we find.
    return node;
  }

  return ts.forEachChild(node, findResultIdentifierNode);
};

export type ExpandTypeOptionsBase = {
  /**
   * The type expression to expand.
   * @example "ReturnType<typeof myFunction>"
   */
  typeExpression: string;

  /**
   * TypeScript compiler options.
   */
  tsCompilerOptions?: ts.CompilerOptions;

  /**
   * Prettier options.
   */
  prettify?: {
    /**
     * Whether to prettify the output.
     * @default true
     */
    enabled?: boolean;
    /**
     * Prettier options. Don't forget to set the parser to "typescript".
     * @default { parser: "typescript", semi: false }
     */
    options?: PrettierOptions;
  };

  /**
   * A record of functions to override in the compiler host. Useful for mocking
   */
  compilerHostFunctionOverrides?: CompilerHostFunctionOverrides;
};
export type ExpandTypeFromSourceFileOptions = ExpandTypeOptionsBase & {
  /**
   * Name of the source file to evaluate the type expression in.
   */
  sourceFileName: string;
};
export type ExpandTypeFromSourceTextOptions = ExpandTypeOptionsBase & {
  /**
   * TypeScript source text to evaluate the type expression in.
   */
  sourceText: string;
};
export type ExpandMyTypeOptions =
  | ExpandTypeFromSourceFileOptions
  | ExpandTypeFromSourceTextOptions;

export async function expandMyType(
  options: ExpandTypeFromSourceTextOptions,
): Promise<string>;
export async function expandMyType(
  options: ExpandTypeFromSourceFileOptions,
): Promise<string>;

/**
 * Expands a TypeScript type expression.
 *
 * @param options
 * @returns The expanded type expression.
 */
export async function expandMyType(options: ExpandMyTypeOptions) {
  if (options.typeExpression.trim() === "") {
    return "never";
  }

  if ("sourceText" in options) {
    const dummyFileName = "expand-my-type-dummy.ts";

    return expandMyType({
      sourceFileName: dummyFileName,
      typeExpression: options.typeExpression,
      compilerHostFunctionOverrides: {
        readFile(fileName: string) {
          if (path.basename(fileName) === dummyFileName) {
            return options.sourceText;
          }

          return ts.sys.readFile(fileName);
        },
      },
      tsCompilerOptions: options.tsCompilerOptions,
    });
  }

  const resolvedSourceFileName = path.resolve(options.sourceFileName);

  const tsCompilerOptions = options.tsCompilerOptions ?? {
    noEmit: true,

    allowSyntheticDefaultImports: true,
    allowArbitraryExtensions: true,
    allowImportingTsExtensions: true,
    allowJs: true,
  };

  const compilerHost = createAugmenterCompilerHost(
    resolvedSourceFileName,
    createExpandCodeBlock(options.typeExpression),
    tsCompilerOptions,
    options.compilerHostFunctionOverrides,
  );

  const program = ts.createProgram(
    [resolvedSourceFileName],
    tsCompilerOptions,
    compilerHost,
  );

  const sourceFile = program.getSourceFile(resolvedSourceFileName);
  if (!sourceFile) {
    throw new Error("Source file not found!");
  }

  const resultIdentifierNode = findResultIdentifierNode(sourceFile);
  if (!resultIdentifierNode) {
    throw new Error("No node found!");
  }

  const typeChecker = program.getTypeChecker();
  const expandedTypeString = typeChecker.typeToString(
    typeChecker.getTypeAtLocation(resultIdentifierNode),
    undefined,
    ts.TypeFormatFlags.NodeBuilderFlagsMask,
  );

  if (options.prettify && options.prettify.enabled === false) {
    return expandedTypeString;
  }

  return formatTypeExpression(expandedTypeString, options.prettify?.options);
}
