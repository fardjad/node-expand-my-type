import { createExpanderCompilerHost } from "./create-expander-compiler-host.ts";
import { format, type Options as PrettierOptions } from "prettier";
import ts from "typescript";

/**
 * Finds the node that represents the TYPE_EXPANDER_RESULT type.
 *
 * @param node Node in which the TYPE_EXPANDER_RESULT type should be searched.
 * @returns The node that represents the TYPE_EXPANDER_RESULT type.
 */
const findTypeExpanderResultNode = (node: ts.Node): ts.Node | undefined => {
  if (node.getChildCount() == 0) {
    if (!ts.isIdentifier(node)) {
      return undefined;
    }

    // Since we put the __TYPE_EXPANDER_RESULT__ type at the beginning of the
    // file, we can return the first identifier we find.
    return node;
  }

  return ts.forEachChild(node, findTypeExpanderResultNode);
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
};
export type ExpandTypeFromSourceFileOptions = ExpandTypeOptionsBase & {
  /**
   * Name of the source file to evaluate the type expression in.
   */
  sourceFileName: string;
  /**
   * Function that returns the source file. When not specified, the implementation of the default TypeScript compiler host is used.
   */
  getSourceFileFunction?: ts.CompilerHost["getSourceFile"];
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
    const sourceFile = ts.createSourceFile(
      "test.ts",
      options.sourceText,
      ts.ScriptTarget.Latest,
      true,
    );

    return expandMyType({
      sourceFileName: "test.ts",
      typeExpression: options.typeExpression,
      getSourceFileFunction: () => sourceFile,
      tsCompilerOptions: options.tsCompilerOptions,
    });
  }

  const tsCompilerOptions = options.tsCompilerOptions ?? {
    noEmit: true,

    allowSyntheticDefaultImports: true,
    allowArbitraryExtensions: true,
    allowImportingTsExtensions: true,
    allowJs: true,
  };

  const compilerHost = createExpanderCompilerHost(
    options.sourceFileName,
    options.typeExpression,
    tsCompilerOptions,
    options.getSourceFileFunction,
  );

  const program = ts.createProgram(
    [options.sourceFileName],
    tsCompilerOptions,
    compilerHost,
  );

  const sourceFile = program.getSourceFile(options.sourceFileName);
  if (!sourceFile) {
    throw new Error("Source file not found!");
  }

  const firstIdentifier = findTypeExpanderResultNode(sourceFile);
  if (!firstIdentifier) {
    throw new Error("No node found!");
  }

  const typeChecker = program.getTypeChecker();
  const expandedType = typeChecker.typeToString(
    typeChecker.getTypeAtLocation(firstIdentifier),
    undefined,
    ts.TypeFormatFlags.NodeBuilderFlagsMask,
  );

  if (options.prettify && options.prettify.enabled === false) {
    return expandedType;
  }

  const dummyTypeName = "__TYPE_EXPANDER_RESULT__";

  return (
    await format(
      `type ${dummyTypeName} = ${expandedType}`,
      options.prettify?.options ?? {
        parser: "typescript",
        semi: false,
      },
    )
  )
    .trim()
    .substring(`type ${dummyTypeName} = `.length);
}
