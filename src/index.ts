import path from "node:path";
import type { Configuration as BiomeConfiguration } from "@biomejs/wasm-nodejs";
import * as tsAst from "typescript/unstable/ast";
import * as ts from "typescript/unstable/async";
import {
  type CompilerHostFunctionOverrides,
  createAugmenterCompilerHost,
} from "./augmenter-compiler-host.js";
import {
  createExpandCodeBlock,
  formatTypeExpression,
} from "./code-generator.js";

/**
 * Finds the result type identifier node.
 *
 * @param node Node in which type type should be searched.
 * @returns The result type identifier node.
 */
const findResultIdentifierNode = (node: tsAst.Node): tsAst.Node | undefined => {
  let result: tsAst.Node | undefined;

  if (tsAst.isIdentifier(node)) {
    result = node;
  } else {
    node.forEachChild((child) => {
      result ??= findResultIdentifierNode(child);
    });
  }

  return result;
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
   * Prettify options.
   */
  prettify?: {
    /**
     * Whether to prettify the output.
     * @default true
     */
    enabled?: boolean;
    /**
     * Biome formatting configuration.
     */
    biomeOptions?: BiomeConfiguration;
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
        ...options.compilerHostFunctionOverrides,
        readFile(fileName: string) {
          if (path.basename(fileName) === dummyFileName) {
            return options.sourceText;
          }

          return options.compilerHostFunctionOverrides?.readFile?.(fileName);
        },
      },
      tsCompilerOptions: options.tsCompilerOptions,
      prettify: options.prettify,
    });
  }

  const resolvedSourceFileName = path.resolve(options.sourceFileName);

  const tsCompilerOptions = options.tsCompilerOptions ?? {
    noEmit: true,
    strictNullChecks: true,
    allowSyntheticDefaultImports: true,
    allowArbitraryExtensions: true,
    allowImportingTsExtensions: true,
    allowJs: true,
  };

  if (!tsCompilerOptions.strictNullChecks) {
    throw new Error("strictNullChecks must be enabled!");
  }

  // The TypeScript 7 unstable API does not accept compiler options directly
  // in updateSnapshot. Supply them through a virtual project configuration.
  const virtualConfigFileName = path.join(
    process.cwd(),
    "expand-my-type-tsconfig.json",
  );
  const virtualConfig = JSON.stringify({
    compilerOptions: tsCompilerOptions,
    files: [resolvedSourceFileName],
  });

  const compilerHost = createAugmenterCompilerHost(
    resolvedSourceFileName,
    createExpandCodeBlock(options.typeExpression),
    {
      ...options.compilerHostFunctionOverrides,
      readFile(fileName) {
        if (path.resolve(fileName) === virtualConfigFileName) {
          return virtualConfig;
        }

        return options.compilerHostFunctionOverrides?.readFile?.(fileName);
      },
    },
  );

  const api = new ts.API({
    cwd: process.cwd(),
    fs: compilerHost,
  });
  let snapshot: Awaited<ReturnType<typeof api.updateSnapshot>> | undefined;

  try {
    snapshot = await api.updateSnapshot({
      openProjects: [virtualConfigFileName],
      openFiles: [resolvedSourceFileName],
    });
    const project = await snapshot.getDefaultProjectForFile(
      resolvedSourceFileName,
    );
    if (!project) {
      throw new Error("Source file not found!");
    }

    const sourceFile = await project.program.getSourceFile(
      resolvedSourceFileName,
    );
    if (!sourceFile) {
      throw new Error("Source file not found!");
    }

    const resultIdentifierNode = findResultIdentifierNode(sourceFile);
    if (!resultIdentifierNode) {
      throw new Error("No node found!");
    }

    const typeChecker = project.checker;
    const resultType =
      await typeChecker.getTypeAtLocation(resultIdentifierNode);
    if (!resultType) {
      throw new Error("No type found!");
    }

    const expandedTypeString = await typeChecker.typeToString(
      resultType,
      undefined,
      ts.NodeBuilderFlags.NoTruncation,
    );

    if (options.prettify?.enabled === false) {
      return expandedTypeString;
    }

    return formatTypeExpression(
      expandedTypeString,
      options.prettify?.biomeOptions,
    );
  } finally {
    try {
      await snapshot?.dispose();
    } finally {
      await api.close();
    }
  }
}
