import { readFileSync } from "node:fs";
import path from "node:path";
import type { FileSystem } from "typescript/unstable/fs";

export type CompilerHostFunctionOverrides = Partial<FileSystem>;

/**
 * Creates the virtual filesystem used by TypeScript's native compiler API.
 *
 * @param sourceFileName Name of the source file to augment.
 * @param codeToAdd Type expression.
 * @param compilerHostFunctionOverrides A record of filesystem functions to override.
 * @returns A virtual filesystem for a TypeScript API session.
 */
export const createAugmenterCompilerHost = (
  sourceFileName: string,
  codeToAdd: string,
  compilerHostFunctionOverrides?: CompilerHostFunctionOverrides,
): FileSystem => {
  const overrides = compilerHostFunctionOverrides ?? {};

  return {
    ...overrides,
    readFile: (fileName) => {
      let contents: string | null | undefined;

      if (overrides.readFile) {
        contents = overrides.readFile(fileName);
        if (contents === undefined) {
          try {
            contents = readFileSync(fileName, "utf8");
          } catch {
            contents = null;
          }
        }
      } else {
        try {
          contents = readFileSync(fileName, "utf8");
        } catch {
          contents = null;
        }
      }

      if (contents === undefined || contents === null) {
        return contents;
      }

      if (path.resolve(fileName) !== path.resolve(sourceFileName)) {
        return contents;
      }

      return `${codeToAdd}\n${contents}`;
    },
  };
};
