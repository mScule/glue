import { createError } from "./error.ts";
import { createIterator, Iterator } from "./iterator.ts";
import { Location } from "./location.ts";
import { Scanner } from "./scanner.ts";

function isBlank(char: string) {
  return char.match(/\s|\n|\t|\r/);
}

function isLetter(char: string) {
  return char.match(/[a-z]|[A-Z]/);
}

function isDigit(char: string) {
  return char.match(/[0-9]/);
}

function skipComment(scanner: Scanner) {
  while (true) {
    const cur = scanner.cur();

    if (!cur || cur === "\n") {
      break;
    }

    scanner.next();
  }
}

function skipBlanks(scanner: Scanner) {
  while (true) {
    const cur = scanner.cur();

    if (!(cur && isBlank(cur))) {
      break;
    }

    scanner.next();
  }
}

function buildNumberToken(scanner: Scanner): Token {
  let val = "";
  let current = scanner.cur();

  while (current && isDigit(current)) {
    val += current;

    scanner.next();
    current = scanner.cur();

    if (current === ".") {
      val += current;
      scanner.next();
      current = scanner.cur();

      if (!(current && isDigit(current))) {
        throw createError(
          'Numeric literal does not have digits after fractional part "."',
          scanner.loc(),
        );
      }

      while (current && isDigit(current)) {
        val += current;
        scanner.next();
        current = scanner.cur();
      }
    }
  }

  return { type: "TOKEN_NUMBER", val, loc: scanner.loc() };
}

function buildStringToken(scanner: Scanner): Token {
  let val = "";

  while (true) {
    scanner.next();
    const current = scanner.cur();

    if (current === null) {
      throw createError(
        "String literal is not correctly enclosed within double quotes",
        scanner.loc(),
      );
    }

    if (current === '"') {
      scanner.next();
      break;
    }

    if (current === "\\") {
      scanner.next();

      const current = scanner.cur();

      switch (current) {
        case "t":
          val += "\t";
          continue;

        case "n":
          val += "\n";
          continue;

        case "r":
          val += "\r";
          continue;

        case '"':
          val += '"';
          continue;

        case "\\":
          val += "\\";
          continue;

        default:
          throw createError(
            `String literal contains unsupported escape sequence \\${current}`,
            scanner.loc(),
          );
      }
    }

    val += current;
  }

  return { type: "TOKEN_STRING", val, loc: scanner.loc() };
}

function buildWordToken(scanner: Scanner): Token {
  let val = "";
  let current = scanner.cur();

  while (
    current !== null &&
    (isLetter(current) || isDigit(current) || current === "_")
  ) {
    val += current;
    scanner.next();
    current = scanner.cur();
  }

  switch (val) {
    case "null":
      return { type: "TOKEN_NULL", loc: scanner.loc() };

    case "true":
    case "false":
      return { type: "TOKEN_BOOL", val, loc: scanner.loc() };

    case "list":
    case "dict":
    case "func":
    case "pipe":
    case "and":
    case "or":
    case "var":
    case "const":
    case "if":
    case "for":
    case "in":
    case "while":
    case "break":
    case "return":
    case "import":
    case "from":
    case "as":
      return { type: "TOKEN_KEYWORD", val, loc: scanner.loc() };
    default:
      return { type: "TOKEN_ID", val, loc: scanner.loc() };
  }
}

function buildSymbolToken(scanner: Scanner): Token {
  const current = scanner.cur();
  let val = "";

  switch (scanner.cur()) {
    case "{":
    case "}":
    case ")":
    case "*":
    case "/":
    case "%":
    case "+":
    case "-":
    case ".":
    case "|":
      val = scanner.cur()!;
      scanner.next();
      break;

    case "(":
      {
        const peak = scanner.peak(-1) ?? "";

        if (
          isLetter(peak) || isDigit(peak) || peak === '"' || peak === ")" ||
          peak === "}" || peak === "."
        ) {
          scanner.next();
          return { type: "TOKEN_STICKY_PAREN_L", loc: scanner.loc() };
        }

        val = scanner.cur()!;
        scanner.next();
      }
      break;

    case "!":
      val += scanner.cur();
      scanner.next();

      if (scanner.cur() === "=") {
        val += scanner.cur();
        scanner.next();
      }
      break;

    case "=":
      val += scanner.cur();
      scanner.next();

      if (scanner.cur() === "=") {
        val += scanner.cur();
        scanner.next();
      }
      break;

    case "<":
      val += scanner.cur();
      scanner.next();

      if (scanner.cur() === "=") {
        val += scanner.cur();
        scanner.next();
      }
      break;

    case ">":
      val += scanner.cur();
      scanner.next();

      if (scanner.cur() === "=") {
        val += scanner.cur();
        scanner.next();
      }
      break;

    default:
      throw createError(
        `Symbolic literal ${current} is unknown`,
        scanner.loc(),
      );
  }

  return { type: "TOKEN_SYMBOL", val, loc: scanner.loc() };
}

export type TokenType<T extends string> = { type: T };
export type WithVal = { val: string }
export type WithLoc = { loc: Location } 

// Static tokens

export type EofToken          = TokenType<"TOKEN_EOF">            & WithLoc;
export type NullToken         = TokenType<"TOKEN_NULL">           & WithLoc;
export type StickyParenLToken = TokenType<"TOKEN_STICKY_PAREN_L"> & WithLoc;

// Dynamic tokens

export type BoolToken    = TokenType<"TOKEN_BOOL">    & WithVal & WithLoc;
export type SymbolToken  = TokenType<"TOKEN_SYMBOL">  & WithVal & WithLoc;
export type KeywordToken = TokenType<"TOKEN_KEYWORD"> & WithVal & WithLoc;
export type IdToken      = TokenType<"TOKEN_ID">      & WithVal & WithLoc;
export type StringToken  = TokenType<"TOKEN_STRING">  & WithVal & WithLoc;
export type NumberToken  = TokenType<"TOKEN_NUMBER">  & WithVal & WithLoc;

export type Token =
  | EofToken
  | NullToken
  | StickyParenLToken

  | BoolToken
  | SymbolToken
  | KeywordToken
  | IdToken
  | StringToken
  | NumberToken;

export type TokenOfType<T extends Token["type"]> = Extract<Token, { type: T }>

export function stringifyToken(token: Token) {
  switch (token.type) {
    case "TOKEN_NULL":
      return `NULL`
    case "TOKEN_BOOL":
      return `BOOL(${token.val})`
    case "TOKEN_STICKY_PAREN_L":
      return `STICKY (`
    case "TOKEN_SYMBOL":
      return `SYMBOL ${token.val}`
    case "TOKEN_KEYWORD":
      return `KEYWORD(${token.val})`
    case "TOKEN_ID":
      return `ID(${token.val})`
    case "TOKEN_STRING":
      return `STRING(${token.val})`
    case "TOKEN_NUMBER":
      return `NUMBER(${token.val})`
    case "TOKEN_EOF":
      return `EOF`
  }
}

export type Tokenizer = Iterator<Token>;

export function tokenize(scanner: Scanner): Tokenizer {
  const tokens: Token[] = [];

  while (scanner.cur() !== null) {
    skipBlanks(scanner);

    const cur = scanner.cur();

    if (cur === null) {
      break;
    }

    if (cur === "#") {
      skipComment(scanner);
      continue;
    }

    if (cur === '"') {
      tokens.push(buildStringToken(scanner));
      continue;
    }

    if (isDigit(cur ?? "")) {
      tokens.push(buildNumberToken(scanner));
      continue;
    }

    if (isLetter(cur ?? "")) {
      tokens.push(buildWordToken(scanner));
      continue;
    }

    tokens.push(buildSymbolToken(scanner));
  }

  return createIterator(tokens, { type: "TOKEN_EOF", loc: scanner.loc() });
}
