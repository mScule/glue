# Glue

Just an idea about a syntax that might look consistent for a js like scripting
language. POC compiler transpiles it to js.

## Ideas

- One idea would be to ditch `,` and `;` altogether so splitting code into
  multiple lines would always look nice.
- lists (arrays), dicts (dictionaries), and funcs (functions) would share almost
  unified syntax for declaration.
- Everything thats accessed from some data structure is done via `.` to simplify
  and unify the DX
- Only if is avaliable for conditional stuff. This would encourage the use of
  early exits

## Grammar

```
list = "list" "{" expr* "}"
dict = "dict" "{" ((NUMBER | STRING | ID) "=" expr)* "}"'
func = "func" (("(" ID* ")") | ID) (("->" stmt) | "{" stmt* "}")
pipe = "pipe" ID (("->" stmt) | "{" stmt* "}")
block = "block" "{" stmt* "}"

func_call  = STICKY_PAREN_L expr* PAREN_R
field_call = "." (NUMBER | STRING | ID | STICKY_PAREN_L expr PAREN_R ")"

primary   = "null" | BOOL | NUMBER | STRING | ID | list | dict | func | pipe | block | "(" expr ")"
func_call = primary (func_call | field_call)*
pipe_call = func_call ("|" pipe_call)?
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

## Intrinsic functions

| Name    | Signature                                              | Descrition                                           |
| ------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `dir`   | `func (path: string): list dict { name size created }` | List contents of a folder                            |
| `read`  | `func (path: string): string`                          | Reads content from a file                            |
| `write` | `func (path: string content: string)`                  | Writes content to a file                             |
| `quote` | `func (code: any): dict`                               | Returns AST of the given code                        |
| `log`   | `func (message: string)`                               | Print general information during program execution   |
| `panic` | `func (message: string)`                               | Halts the program and shows an error message         |

## Example

```

```
