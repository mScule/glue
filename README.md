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
list = "list" "{" expr* "}"
dict = "dict" "{" ((NUMBER | STRING | ID) "=" expr)* "}"
func = "func" (("(" ID* ")") | ID) (("->" stmt) | "{" stmt* "}")
pipe = "pipe" ID (("->" stmt) | "{" stmt* "}")

func_call  = STICKY_PAREN_L expr* PAREN_R
field_call = "." (NUMBER | STRING | ID | STICKY_PAREN_L expr PAREN_R ")"

primary   = "null" | BOOL | NUMBER | STRING | ID | list | dict | func | pipe | "(" expr ")"
call      = primary (func_call | field_call)*
pipe_call = call ("|" pipe_call)?
unary     = pipe_call | ("!" | "-") unary

factor = unary  (("*" | "/" | "%") unary)*
term   = factor (("+" | "-") factor)*
comp   = term   ((">" | "<" | ">=" | "<=") term)*
eq     = comp   (("!=" | "==") comp)*
and    = eq     (("and") eq)*
or     = and    (("or") and)*
expr   = or

assig  = expr ("=" expr)?

decl       = "export"? "var" ("{" ID* "}" | ID) "=" expr
if         = "if" expr "{" stmt* "}"
for        = "for" ID "in" expr "{" stmt* "}"
while      = "while" expr "{" stmt* "}"
break      = "break"
return     = "return" ("{" expr* "}" | expr)
mod_import = "import" ID ("." ID)* "as" ID
var_import = "from" ID ("." ID)* "import" "{" ID* "}"

stmt =
     | assig
     | decl
     | if
     | for
     | while
     | break
     | return
     | mod_import
     | var_import
```

## Example

```
var last  = pipe cur -> cur.(cur.length - 1)

var human = func (name age) -> dict {
     name = name or ""
     age  = age  or 0
}

var add_years = func (amt) -> pipe human {
     human.age = human.age + amt
}

var humans = list {
     human("Peter" 58)
     human("Lois" 43)
     human("Stewie" 1)
     human("Brian" 10)
}

humans | last | add_years(300)
```
