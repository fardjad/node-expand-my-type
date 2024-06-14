import { expandMyType } from "./index.ts";
import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(new URL(import.meta.url)));
const fixturesDirectory = path.join(__dirname, "fixtures");

await test("empty expression", async () => {
  const actual = await expandMyType({
    sourceFileName: "does-not-matter.ts",
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
    sourceText: "",
    typeExpression: "@invalid@",
  });

  assert.strictEqual(actual, "any");
});

await test("invalid source", async () => {
  const actual = await expandMyType({
    sourceText: "@invalid@",
    typeExpression: "string",
  });

  assert.strictEqual(actual, "string");
});

await test("source is a complex object", async () => {
  const result = await expandMyType({
    sourceText: `
      type A<T> = {
        a: string;
      } & B<T>;

      type B<T> = {
        b: T;
      };`,
    typeExpression: "A<number>",
  });

  assert.strictEqual(result, "{ a: string; b: number }");
});

await test("expand function type", async () => {
  const actual = await expandMyType({
    sourceText: `
      type Result = {
        a: C;
      };

      type B = "a" | "b";
      type A = B;
      type C = (a: A) => string;
    `,
    typeExpression: "Result",
  });

  assert.strictEqual(actual, `{ a: (a: "a" | "b") => string }`);
});

await test("expand a union of string literal types", async () => {
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

await test("expand an imported union of string literal types", async () => {
  const testFilePath = path.join(
    fixturesDirectory,
    "union-of-string-literal-types/test.ts",
  );

  const actual = await expandMyType({
    sourceFileName: testFilePath,
    typeExpression: "Result",
  });

  assert.strictEqual(actual, '{ a: "a" | "b" }');
});

await test("expand a promise type", async () => {
  const actual = await expandMyType({
    sourceText: `
      type B = "a" | "b";
      type A = B;

      type Result = {
        a: Promise<A>;
      };
    `,
    typeExpression: "Result",
  });

  assert.strictEqual(actual, `{ a: Promise<"a" | "b"> }`);
});
