# Expand My Type

<div class="paragraph">

<span class="image"><a href="https://www.npmjs.com/package/expand-my-type" class="image"><img src="https://img.shields.io/npm/v/expand-my-type" alt="NPM Version" /></a></span> <span class="image"><a href="https://www.npmjs.com/package/expand-my-type" class="image"><img src="https://img.shields.io/npm/dm/expand-my-type" alt="Monthly Downloads" /></a></span> <span class="image"><a href="https://github.com/fardjad/node-expand-my-type/actions" class="image"><img src="https://img.shields.io/github/actions/workflow/status/fardjad/node-expand-my-type/test-and-release.yml?branch=main" alt="test-and-release Workflow Status" /></a></span>

</div>

In TypeScript, expanding a type (also known as computing, resolving,
simplifying, unpacking, or unwrapping) refers to converting a type expression
into a flattened type that doesn't reference other types. This is mostly done
to improve the readability of type hints shown in editors/IDEs.

**Expand My Type** provides a programmatic way to expand type expressions in
TypeScript (see [How It Works](#how-it-works) section for more information). It
gets the source code as input, along with a type expression and returns the
expanded form as a string. That can be useful for code-generation, testing, and
debugging complex type errors.

Under the hood, it uses the [TypeScript Compiler API][ts-compiler-api] to expand
the type expression and optionally formats the output using
[Prettier][prettier].

## CLI

### Installation

To install the CLI globally, run:

```sh
npm install -g expand-my-type
```

Alternatively, the CLI can be run using `npx`:

```sh
npx expand-my-type
```

### CLI Usage

```
Usage:
  expand-my-type [options] <source-file> <expression>

Options:
  -h, --help                    Show this help message
  -p, --prettify                Prettify the output (default)
  -P, --no-prettify             Do not prettify the output
  -c, --tsconfig <file>         Use the specified tsconfig.json file
```

Given a file named `example.ts` with the following contents:

```typescript
interface SomeInterface {
  a: number;
  b?: string;
  c: number | undefined;
}

type SomeType = {
  d: number;
  e: SomeInterface;
  f: () => void;
};
```

Running the following command expands the type expression `SomeType["e"]`:

```sh
expand-my-type example.ts 'SomeType["e"]'
# Output:
# { a: number; b?: string; c: number }
```

## API

This package exports a function named `expandMyType` that can be used in one of
the following ways:

1. Expand the type expression in a source file:

   Given a file named `example.ts` with the following contents:

   ```typescript
   interface SomeInterface {
     a: number;
     b?: string;
     c: number | undefined;
   }

   type SomeType = {
     d: number;
     e: SomeInterface;
     f: () => void;
   };
   ```

   Running the following code expands the type expression `SomeType`:

   ```typescript
   import { expandMyType } from "expand-my-type";

   const expandedType = await expandMyType({
     typeExpression: "SomeType",
     sourceFileName: "./example.ts",
   });

   console.log(expandedType);
   /* {
     d: number
     e: { a: number; b?: string; c: number }
     f: () => void
   } */
   ```

2. Expand the type expression in a source text:

   ```typescript
   import { expandMyType } from "expand-my-type";

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
   /* { a: string; b: number } */
   ```

## How It Works

Expand My Type uses the following utility types to expand the type expression:

```typescript
// Expands a type expression
type Expand<T> = T extends (...args: infer A) => infer R
  ? (...args: Expand<A>) => Expand<R>
  : {
      [K in keyof T]: T[K] extends string ? ExpandString<T[K]> : Expand<T[K]>;
    } & {};

// Forces a union of string literal types to be expanded
type ExpandString<T extends string> = RemoveUnderscore<AppendUnderscore<T>>;
type AppendUnderscore<T extends string> = `${T}_` extends string
  ? `${T}_`
  : never;
type RemoveUnderscore<T extends string> = T extends `${infer U}_` ? U : never;
```

This approach comes with some limitations. Most notably, expanding a type that
leads to an infinite recursion might throw an error (when prettify option is
enabled), return a truncated output, or return any.

[prettier]: https://prettier.io
[ts-compiler-api]: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
