import { createContext, evaluate } from "./interpreter.ts";
import { parse } from "./parser.ts";
import { scan } from "./scanner.ts";
import { tokenize } from "./tokenizer.ts";

import { join, relative } from "@std/path";

function getArg(args: string[], ...keys: string[]) {
  for (const key of keys) {
    const index = args.indexOf(key);
    if (index !== -1 && index + 1 < args.length) {
      return args[index + 1];
    }
  }
  return null;
}

async function buildProject(projectPath: string) {
  const configPath = join(projectPath, "glueconfig.json");

  let config;
  try {
    const raw = await Deno.readTextFile(configPath);
    config = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read glueconfig.json:", err);
    Deno.exit(1);
  }

  const sourceDir = join(projectPath, config.source);
  const buildDir = join(projectPath, config.build);

  for await (const entry of Deno.readDir(sourceDir)) {
    await processEntry(entry.name, sourceDir, buildDir);
  }
}

async function processEntry(
  entryName: string,
  sourceRoot: string,
  buildRoot: string,
  currentPath = ""
) {
  const fullPath = join(sourceRoot, currentPath, entryName);
  const stat = await Deno.stat(fullPath);

  if (stat.isDirectory) {
    for await (const entry of Deno.readDir(fullPath)) {
      await processEntry(entry.name, sourceRoot, buildRoot, join(currentPath, entryName));
    }
  } else if (stat.isFile) {
    const inputPath = fullPath;

    const relativePath = relative(sourceRoot, inputPath);

    try {
      const source = await Deno.readTextFile(inputPath);
      const chars = scan(source);
      const tokens = tokenize(chars);
      const ast = parse(tokens);

      evaluate(ast)

    } catch (err) {
      console.error("Failed to build:", relativePath);
      console.error(err);
    }
  }
}

if (import.meta.main) {
  const projectPath = getArg(Deno.args, "-p", "--project");

  if (!projectPath) {
    console.error("Usage: -p <projectPath>");
    Deno.exit(1);
  }

  await buildProject(projectPath);
}
