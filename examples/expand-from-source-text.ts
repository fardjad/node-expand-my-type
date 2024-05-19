import { expandMyType } from "../src/index.ts";

const expandedType = await expandMyType({
  typeExpression: "A<number>",
  sourceText: `
    type A<T> = {
      a: string;
    } & B<T>;

    type B<T> = {
      b: T;
    };
  `,
});

console.log(expandedType);
