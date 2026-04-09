#!/usr/bin/env node
import { type ParseArgsConfig, parseArgs } from "node:util";
import ts from "typescript";
import { expandMyType } from "./index.js";

type Values = {
  help?: boolean;
  prettify?: boolean;
  "no-prettify"?: boolean;
  tsconfig?: string;
};

const tryParse = <
  Values extends Record<
    string,
    string | boolean | Array<string | boolean> | undefined
  >,
  Options extends ParseArgsConfig["options"] = ParseArgsConfig["options"],
>(
  options: Options,
): { error?: Error; values: Values; positionals: string[] } => {
  let result: ReturnType<typeof parseArgs>;
  try {
    result = parseArgs({
      options,
      tokens: true,
      allowPositionals: true,
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      values: {} as Values,
      positionals: [],
    };
  }

  const { tokens, values, positionals } = result;

  // Reprocess the option tokens and overwrite the returned values.
  for (const token of tokens ?? []) {
    if (token.kind === "option-terminator" || token.kind === "positional") {
      continue;
    }

    if (token.name.startsWith("no-")) {
      // Store foo:false for --no-foo
      const positiveName = token.name.slice("no-".length);
      values[positiveName] = false;
      delete values[token.name];
    } else {
      // Resave value so last one wins if both --foo and --no-foo.
      values[token.name] = token.value ?? true;
    }
  }

  return {
    error: undefined,
    values: values as Values,
    positionals,
  };
};

const { error, values, positionals } = tryParse<Values>({
  help: {
    type: "boolean",
    short: "h",
  },
  prettify: {
    type: "boolean",
    short: "p",
    default: true,
  },
  "no-prettify": {
    type: "boolean",
    short: "P",
  },
  tsconfig: {
    type: "string",
    short: "c",
  },
});

if (error) {
  console.error(error.message);
  process.exit(1);
}

const usagePrompt = [
  "Usage:",
  "  expand-my-type [options] <source-file> <expression>",
  "",
  "Options:",
  "  -h, --help\t\t\tShow this help message",
  "  -p, --prettify\t\tPrettify the output (default)",
  "  -P, --no-prettify\t\tDo not prettify the output",
  "  -c, --tsconfig <file>\t\tUse the specified tsconfig.json file",
].join("\n");

if (values.help) {
  console.error(usagePrompt);
  process.exit(0);
}

if (positionals.length !== 2) {
  console.error(usagePrompt);
  process.exit(1);
}

const [sourceFileName, typeExpression] = positionals;
const prettify = values.prettify ?? true;
const tsConfigFileName = values.tsconfig;

let tsParsedCommandLine: ts.ParsedCommandLine | undefined;

if (tsConfigFileName) {
  const configFile = ts.readConfigFile(tsConfigFileName, ts.sys.readFile);
  const compilerOptions = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    "./",
  );

  tsParsedCommandLine = compilerOptions;
}

const result = await expandMyType({
  sourceFileName,
  typeExpression,
  prettify: {
    enabled: prettify,
  },
  tsCompilerOptions: tsParsedCommandLine?.options,
});

console.log(result);
