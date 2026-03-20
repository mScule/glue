import { parseAst } from "./parser.ts";
import { createScanner } from "./scanner.ts";
import { createTokenizer } from "./tokenizer.ts";

Deno.test(function tokenizerTest() {
  const scanner = createScanner(`
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

  const tokenizer = createTokenizer(scanner)
  const ast = parseAst(tokenizer)

  console.log(JSON.stringify(ast))
});
