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

  return { type: "NUMBER", val, loc: scanner.loc() };
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

  return { type: "STRING", val, loc: scanner.loc() };
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
      return { type: "NULL", loc: scanner.loc() };

    case "true":
    case "false":
      return { type: "BOOL", loc: scanner.loc() };

    case "list":
    case "dict":
    case "func":

    case "and":
    case "or":

    case "var":
    case "if":
    case "for":
    case "in":
    case "while":
    case "break":
    case "return":
      return { type: "KEYWORD", val, loc: scanner.loc() };
    default:
      return { type: "ID", val, loc: scanner.loc() };
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
      val = scanner.cur()!;
      scanner.next();
      break;

    case "(":
      if (!isBlank(scanner.peak(-1) ?? "")) {
        scanner.next();
        return { type: "STICKY_PAREN_L", loc: scanner.loc() };
      }
      val = scanner.cur()!;
      scanner.next();
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
      throw createError(`Symbolic literal ${current} is unknown`, scanner.loc());
  }

  return { type: "SYMBOL", val, loc: scanner.loc() };
}

export type TokenBase<T extends string> = {
  type: T;
  loc: Location;
};

export type WithVal = { val: string };

export type Token =
  | TokenBase<"NULL" | "BOOL" | "STICKY_PAREN_L">
  | (TokenBase<"SYMBOL" | "KEYWORD" | "ID" | "STRING" | "NUMBER"> & WithVal);

export type Tokenizer = Iterator<Token>;

export function createTokenizer(scanner: Scanner): Tokenizer {
  const tokens: Token[] = [];

  while (scanner.cur() !== null) {
    skipBlanks(scanner)

    const cur = scanner.cur();

    if (cur === null) {
        break;
    }

    if (cur === '"') {
        tokens.push(buildStringToken(scanner))
        continue;
    }

    if (isDigit(cur ?? "")) {
        tokens.push(buildNumberToken(scanner))
        continue;
    }

    if (isLetter(cur ?? "")) {
        tokens.push(buildWordToken(scanner))
        continue;
    }

    tokens.push(buildSymbolToken(scanner))
  }

  return createIterator(tokens);
}
