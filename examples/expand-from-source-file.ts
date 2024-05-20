import { expandMyType } from "../src/index.ts";
import { fileURLToPath } from "node:url";

const expandedType = await expandMyType({
  typeExpression: "SomeType",
  sourceFileName: fileURLToPath(new URL("./example.ts", import.meta.url)),
});

console.log(expandedType);

/* {
  d: number
  e: { a: number; b?: string; c: number }
  f: () => void
} */
