import { parse } from "./parser.ts";
import { scan } from "./scanner.ts";
import { tokenize } from "./tokenizer.ts";
import { compileToJs } from "./compileToJs.ts";

function getArg(args: string[], key: string) {
  const index = args.indexOf(key);

  if (index === -1 || index + 1 >= args.length) {
    return null;
  }

  return args[index + 1];
}

if (import.meta.main) {
  const inputPath = getArg(Deno.args, "-f");
  const outputPath = getArg(Deno.args, "-o");

  if (!inputPath) {
    console.error("Usage: -f <input> [-o <output>]");
    Deno.exit(1);
  }

  const source = await Deno.readTextFile(inputPath);

  const chars = scan(source);
  const tokens = tokenize(chars);
  const ast = parse(tokens);
  const js = compileToJs(ast);

  if (outputPath) {
    await Deno.writeTextFile(outputPath, js);
  } else {
    eval(js);
  }
}
