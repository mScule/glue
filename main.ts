import { parse } from "./parser.ts";
import { scan } from "./scanner.ts";
import { tokenize } from "./tokenizer.ts";
import { compileToJs } from "./compileToJs.ts";

if (import.meta.main) {
  const chars = scan(`
    var humans = list {
      dict { name = "Mike" age = 12 }
      dict { name = "Jack" age = 18 }
      dict { name = "Mark" age = 17 }
      dict { name = "Root" age = 21 }
    }

    console.log(humans.(0).name)
  `)
  const tokens = tokenize(chars)
  const ast = parse(tokens)
  const js = compileToJs(ast)

  eval(js)
}
