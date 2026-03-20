# Glue

Just an idea about a syntax that might look consistent for a js like scripting language. POC compiler transpiles it to js.

## Ideas 
- One idea would be to ditch `,` and `;` altogether so splitting code into multiple
lines would always look nice.
- lists (arrays), dicts (dictionaries), and funcs (functions) would share almost unified syntax for declaration.
- Everything thats accessed from some data structure is done via `.` to simplify and unify the DX
- Only if is avaliable for conditional stuff. This would encourage the use of early exits

## Glue grammar

```
list = "list"  "{" expr* "}"
dict = "dict" "{" ((NUMBER | STRING | ID) "=" expr)* "}"
func = "func" "(" ID* ")" "{" stmt* "}"

func_call  = STICKY_PAREN_L expr* PAREN_R
field_call = "." (NUMBER | STRING | ID | STICKY_PAREN_L expr PAREN_R ")"

primary = "null" | BOOL | NUMBER | STRING | ID | list | dict | func | "(" expr ")"
call    = primary (func_call | field_call)*
unary   = call | ("!" | "-") unary

factor = unary  (("*" | "/" | "%") unary)*
term   = factor (("+" | "-") factor)*
comp   = term   ((">" | "<" | ">=" | "<=") term)*
eq     = comp   (("!=" | "==") comp)*
and    = eq     (("and") eq)*
or     = and    (("or") and)*
expr   = or

assig  = expr ("=" expr)?
decl   = "var" ID "=" expr
if     = "if" expr "{" stmt* "}"
for    = "for" ID "in" expr "{" stmt* "}"
while  = "while" expr "{" stmt* "}"
break  = "break"
return = "return" expr

stmt = assig | decl | if | for | while | break | return
```

## Example

Input:
```
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
  console.log("Name: " user.name " Age: " user.age)
}
```

Output:
```js
let create_user = function(name,age){return {name:name  || "" ,age:age  || "" } } ;let users = [create_user ("Mike" ,20 ),create_user ("Jack" ,25 ),create_user ("Mark" ,30 )] ;for (let user of users ){console .log("Name: " ,user .name," Age: " ,user .age)}
```

You can run the example with Deno, `deno run ./main.ts`
