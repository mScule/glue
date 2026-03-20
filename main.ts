import { parse } from "./parser.ts";
import { scan } from "./scanner.ts";
import { tokenize } from "./tokenizer.ts";
import { compileToJs } from "./compileToJs.ts";

if (import.meta.main) {
  const chars = scan(`
    var create_user = func (name age) {
      return dict {
        name = name or ""
        age  = age or ""
      }
    }

    var users = list {
      create_user("Mike" 20)
      create_user("Jack" 25)
      create_user("Mark" 30)
    }

    for user in users {
      print("Name: " user.name " Age: " user.age)
    }
  `)
  const tokens = tokenize(chars)
  const ast = parse(tokens)
  const js = compileToJs(ast)

  eval(js)
}
