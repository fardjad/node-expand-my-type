import { expandMyType } from "./index.ts";
import assert from "node:assert";
import { test } from "node:test";

await test("empty expression", async () => {
  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "",
  });

  assert.strictEqual(actual, "never");
});

await test("non-existent source file", async () => {
  await assert.rejects(
    async () => {
      await expandMyType({
        sourceFileName: "test.ts",
        typeExpression: "string",
        compilerHostFunctionOverrides: {
          readFile() {
            return undefined;
          },
        },
      });
    },
    { message: "Source file not found!" },
  );
});

await test("invalid expression", async () => {
  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "@invalid@",
    compilerHostFunctionOverrides: {
      readFile() {
        return "";
      },
    },
  });

  assert.strictEqual(actual, "any");
});

await test("invalid source", async () => {
  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "string",
    compilerHostFunctionOverrides: {
      readFile() {
        return "@invalid@";
      },
    },
  });

  assert.strictEqual(actual, "string");
});

await test("source is a complex object", async () => {
  const result = await expandMyType({
    sourceFileName: "test.ts",
    compilerHostFunctionOverrides: {
      readFile() {
        return `
          type A<T> = {
            a: string;
          } & B<T>;

          type B<T> = {
            b: T;
          };`;
      },
    },
    typeExpression: "A<number>",
  });

  assert.strictEqual(result, "{ a: string; b: number }");
});

await test("expand type expression from source text", async () => {
  const actual = await expandMyType({
    sourceText: `
      type A<T> = {
        a: string;
      } & B<T>;

      type B<T> = {
        b: T;
      };

      type C = A<number>;
    `,
    typeExpression: "A<number>",
  });

  assert.strictEqual(actual, "{ a: string; b: number }");
});

await test("expand function type", async () => {
  const actual = await expandMyType({
    sourceText: `
      type Result = {
        a: A;
      };

      type A = (a: number) => string;
    `,
    typeExpression: "Result",
  });

  assert.strictEqual(actual, "{ a: (a: number) => string }");
});

await test("expand a union string literal type", async () => {
  const actual = await expandMyType({
    sourceText: `
      type B = "a" | "b";
      type A = B;

      type Result = {
        a: A;
      };
    `,
    typeExpression: "Result",
  });

  assert.strictEqual(actual, '{ a: "a" | "b" }');
});

await test("expand an imported union string literal type", async () => {
  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "Result",
    compilerHostFunctionOverrides: {
      fileExists() {
        return true;
      },

      readFile(fileName) {
        if (fileName.endsWith("b.ts")) {
          return `
          export type B = "a" | "b";
          `;
        }

        if (fileName.endsWith("a.ts")) {
          return `
          import { B } from "./b.ts";
          export type A = B;
          `;
        }

        if (fileName.endsWith("test.ts")) {
          return `
          import { A } from "./a.ts";
          
          interface Result {
            a: A;
          }
          `;
        }
      },
    },
  });

  assert.strictEqual(actual, '{ a: "a" | "b" }');
});
