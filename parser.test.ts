import { scan } from "./scanner.ts";
import { tokenize } from "./tokenizer.ts";
import { parse } from "./parser.ts";

Deno.test(function tokenizerTest() {
  const scanner = scan(`
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

  const tokenizer = tokenize(scanner)
  const ast = parse(tokenizer)

  console.log(JSON.stringify(ast))
});
