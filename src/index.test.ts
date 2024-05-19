import { expandMyType } from "./index.ts";
import assert from "node:assert";
import { test } from "node:test";
import ts from "typescript";

await test("empty expression", async () => {
  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "",
  });

  assert.strictEqual(actual, "never");
});

await test("non-existent source file", async () => {
  const getSourceFileFunction = () => undefined;

  await assert.rejects(
    async () => {
      await expandMyType({
        sourceFileName: "test.ts",
        getSourceFileFunction,
        typeExpression: "string",
      });
    },
    { message: "Source file not found!" },
  );
});

await test("invalid expression", async () => {
  const getSourceFileFunction = () =>
    ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest);

  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "@invalid@",
    getSourceFileFunction,
  });

  assert.strictEqual(actual, "any");
});

await test("invalid source", async () => {
  const getSourceFileFunction = () =>
    ts.createSourceFile("test.ts", "@invalid@", ts.ScriptTarget.Latest);

  const actual = await expandMyType({
    sourceFileName: "test.ts",
    typeExpression: "string",
    getSourceFileFunction,
  });

  assert.strictEqual(actual, "string");
});

await test("source is a complex object", async () => {
  const getSourceFileFunction = () =>
    ts.createSourceFile(
      "test.ts",
      `
      type A<T> = {
        a: string;
      } & B<T>;

      type B<T> = {
        b: T;
      };`,
      ts.ScriptTarget.Latest,
    );

  const result = await expandMyType({
    sourceFileName: "test.ts",
    getSourceFileFunction,
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
