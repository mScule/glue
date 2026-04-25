import { createError } from "./error.ts";
import { Tokenizer, BoolToken, IdToken, NullToken, NumberToken, StringToken, SymbolToken, Token, stringifyToken, TokenOfType, KeywordToken } from "./tokenizer.ts";

// Literals

export type PrimNode = { type: "NODE_PRIM", val: NullToken | BoolToken | NumberToken | StringToken | IdToken }
export type ListNode = { type: "NODE_LIST", vals: Node[] }
export type DictNode = { type: "NODE_DICT", vals: { key: NumberToken | StringToken | IdToken, val: Node }[] }
export type FuncNode = { type: "NODE_FUNC", params: IdToken[], stmts: Node[] }

// Expressions

export type AssigNode  = { type: "NODE_ASSIG",  target: Node, val: Node }
export type AccessNode = { type: "NODE_ACCESS", origin: Node, props: Node[]  }
export type CallNode   = { type: "NODE_CALL",   args: Node[] }
export type UnaryNode  = { type: "NODE_UNARY",  opr: SymbolToken, expr: Node }
export type BinaryNode = { type: "NODE_BINARY", opr: SymbolToken | KeywordToken, left: Node, right: Node }

// Compound statements

export type IfNode    = { type: "NODE_IF",    cond: Node, stmts: Node[] }
export type WhileNode = { type: "NODE_WHILE", cond: Node, stmts: Node[] }
export type ForNode   = { type: "NODE_FOR",   item: IdToken, iter: Node, stmts: Node[] }

// Control flow

export type SingleReturnNode = { type: "NODE_RETURN_SINGLE", val: Node    }
export type MultiReturnNode  = { type: "NODE_RETURN_MULTI",  vals: Node[] }
export type BreakNode        = { type: "NODE_BREAK" }

// Declaration

export type SingleDeclNode = { type: "NODE_DECL_SINGLE", id: IdToken,    val: Node, export: boolean, macro: boolean }
export type MultiDeclNode  = { type: "NODE_DECL_MULTI",  ids: IdToken[], val: Node, export: boolean, macro: boolean }

// Module

export type ModImportNode = { type: "NODE_IMPORT_MOD",  path: IdToken[], id: IdToken    };
export type VarImportNode = { type: "NODE_IMPORT_VARS", path: IdToken[], ids: IdToken[] };
export type ModuleNode    = { type: "NODE_ROOT", stmts: Node[] }

export type Node =
    | PrimNode         | ListNode        | DictNode  | FuncNode
    | CallNode         | AccessNode      | UnaryNode | BinaryNode
    | IfNode           | WhileNode       | ForNode
    | SingleReturnNode | MultiReturnNode | BreakNode
    | AssigNode
    | SingleDeclNode | MultiDeclNode
    | ModImportNode  | VarImportNode | ModuleNode

function requireType<T extends Token["type"]>(candidate: Token, type: T): TokenOfType<T> {
    if (candidate.type !== type) {
        throw createError(`Expected token of type ${type}, got type ${candidate.type} instead`, candidate.loc);
    }
    return candidate as TokenOfType<T>
}

function requireValueOfType<T extends Token["type"]>(candidate: Token, type: T, val: string): TokenOfType<T> {
    const sameType = requireType(candidate, type)
    const sameVal = "val" in candidate && candidate.val === val

    const isIdentical = sameType && sameVal

    if (!isIdentical) {
        throw createError(`Expected token of with value ${val}, got value ${stringifyToken(candidate)} instead`, candidate.loc)
    }

    return candidate as TokenOfType<T>
}

function parseBlock(tokenizer: Tokenizer): Node[] {
    const stmts: Node[] = []

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
    tokenizer.next() // Eat opening {

    let cur = tokenizer.cur()

    while (!(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        stmts.push(parseStmt(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next() // Eat closing }

    return stmts
}

function parseList(tokenizer: Tokenizer): Node {
    const vals: Node[] = []

    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "list")
    tokenizer.next()

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
    tokenizer.next()

    let cur = tokenizer.cur()

    while (!(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        vals.push(parseExpr(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_LIST", vals }
}

function parseDict(tokenizer: Tokenizer): Node {
    const vals: { key: NumberToken | StringToken | IdToken, val: Node }[] = []

    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "dict")
    tokenizer.next()

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
    tokenizer.next()

    let cur = tokenizer.cur()

    while (!(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        // Key
        const key = tokenizer.cur()

        if (!(key.type === "TOKEN_NUMBER" || key.type === "TOKEN_STRING" || key.type ==="TOKEN_ID")) {
            throw createError(`Dict key has to be either number, string, or id but got ${key.type}`, key.loc)
        }

        tokenizer.next()

        // Eat =
        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "=")
        tokenizer.next()

        // Value

        const val = parseExpr(tokenizer)

        vals.push({ key, val })

        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_DICT", vals }
}

function parseFunc(tokenizer: Tokenizer): Node {
    const params: IdToken[] = []

    let cur = tokenizer.cur()

    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "func")
    tokenizer.next()

    // Params

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "(")
    tokenizer.next()

    cur = tokenizer.cur()

    while (!(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
        const token = tokenizer.cur()

        if (token.type !== "TOKEN_ID") {
            throw createError(`Function parameter declarations has to be ids. Got ${JSON.stringify(token)}`, token.loc)
        }

        params.push(token)
        tokenizer.next()

        cur = tokenizer.cur()
    }

    tokenizer.next()

    // Stmts

    const stmts = parseBlock(tokenizer)

    return { type: "NODE_FUNC", params, stmts }
}

function parseFuncCall(tokenizer: Tokenizer): Node {
    tokenizer.next() // eat "sticky" (

    const args: Node[] = []

    let cur = tokenizer.cur()

    while (!(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
        args.push(parseExpr(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_CALL", args }
}

function parseFieldCall(tokenizer: Tokenizer): Node {
    tokenizer.next() // eat "."

    const cur = tokenizer.cur()

    // Primitive

    if (cur.type === "TOKEN_NUMBER" || cur.type === "TOKEN_STRING" || cur.type === "TOKEN_ID") {
        tokenizer.next()
        return { type: "NODE_PRIM", val: cur }
    }

    // Expression

    if (cur.type === "TOKEN_STICKY_PAREN_L") {
        tokenizer.next() // eat sticky (
        const expr = parseExpr(tokenizer)

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", ")")
        tokenizer.next()

        return expr
    }

    throw createError("Field accessor has to be either number, string, id or expression wrapped in sticky opening parenthese and closing parenthese", tokenizer.cur().loc)
}

function parsePrimary(tokenizer: Tokenizer): Node {
    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_NULL" || cur.type === "TOKEN_BOOL" || cur.type === "TOKEN_NUMBER" || cur.type === "TOKEN_STRING" || cur.type === "TOKEN_ID") {
        tokenizer.next()
        return { type: "NODE_PRIM", val: cur }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "list") {
        return parseList(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "dict") {
        return parseDict(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "func") {
        return parseFunc(tokenizer)
    }

    if (cur.type === "TOKEN_SYMBOL" && cur.val === "(") {
        tokenizer.next() // eat non sticky (
        const expr = parseExpr(tokenizer)

        const cur = tokenizer.cur()

        if (!cur || !(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
            throw createError("Func call expression has to be closed with ) got " + cur, cur?.loc)
        }

        tokenizer.next()

        return expr
    }

    throw createError("Primary has to be either null, bool, number, string, id, list, dict, func, or expression wrapped in non sticky opening parenthese and closing parenthese got " + stringifyToken(cur), tokenizer.cur().loc)
}

function parseCall(tokenizer: Tokenizer): Node {
    const origin = parsePrimary(tokenizer)
    const props: Node[] = []

    let cur = tokenizer.cur()

    while (cur.type === "TOKEN_STICKY_PAREN_L" || (cur.type === "TOKEN_SYMBOL" && cur.val === ".")) {
        if (cur.type === "TOKEN_STICKY_PAREN_L") {
            props.push(parseFuncCall(tokenizer))
        } else {
            props.push(parseFieldCall(tokenizer))
        }

        cur = tokenizer.cur()
    }

    if (props.length === 0) {
        return origin
    }

    return { type: "NODE_ACCESS", origin, props }
}

function parseUnary(tokenizer: Tokenizer): Node {
    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && (cur.val === "!" || cur.val === "-")) {
        tokenizer.next()
        return { type: "NODE_UNARY", opr: cur, expr: parseUnary(tokenizer) }
    }

    return parseCall(tokenizer)
}

function parseFactor(tokenizer: Tokenizer): Node {
    const left = parseUnary(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && (cur.val === "*" || cur.val === "/" || cur.val === "%")) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseFactor(tokenizer) }
    }

    return left
}

function parseTerm(tokenizer: Tokenizer): Node {
    const left = parseFactor(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && (cur.val === "+" || cur.val === "-")) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseTerm(tokenizer) }
    }

    return left
}

function parseComp(tokenizer: Tokenizer): Node {
    const left = parseTerm(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && (cur.val === ">" || cur.val === "<" || cur.val === ">=" || cur.val === "<=")) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseComp(tokenizer) }
    }

    return left
}

function parseEq(tokenizer: Tokenizer): Node {
    const left = parseComp(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && (cur.val === "!=" || cur.val === "==")) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseEq(tokenizer) }
    }

    return left
}

function parseAnd(tokenizer: Tokenizer): Node {
    const left = parseEq(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "and") {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseAnd(tokenizer) }
    }

    return left
}

function parseOr(tokenizer: Tokenizer): Node {
    const left = parseAnd(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "or") {
        tokenizer.next()
        return { type: "NODE_BINARY", opr: cur, left, right: parseOr(tokenizer) }
    }

    return left
}

function parseExpr(tokenizer: Tokenizer): Node {
    return parseOr(tokenizer)
}

function parseAssig(tokenizer: Tokenizer): Node {
    const target = parseExpr(tokenizer)

    const cur = tokenizer.cur()

    if (cur.type === "TOKEN_SYMBOL" && cur.val === "=") {
        tokenizer.next()
        return { type: "NODE_ASSIG", target, val: parseExpr(tokenizer) }
    }

    return target
}

function parseDecl(tokenizer: Tokenizer): Node {
    const first = requireType(tokenizer.cur(), "TOKEN_KEYWORD")

    // export (optional)
    let doExport = false

    if (first.val === "export") {
        tokenizer.next(),
        doExport = true
    }

    // var
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "var")
    tokenizer.next()

    if (tokenizer.cur().type === "TOKEN_SYMBOL") {
        // { ids* }

        const ids: IdToken[] = []

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
        tokenizer.next()

        let token = tokenizer.cur()

        while (!(token.type === "TOKEN_SYMBOL" && token.val === "}")) {
            const id = requireType(token, "TOKEN_ID")
            ids.push(id)

            tokenizer.next()
            token = tokenizer.cur()
        }

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "}")
        tokenizer.next()

        // =
        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "=")
        tokenizer.next()

        return { type: "NODE_DECL_MULTI", ids, val: parseExpr(tokenizer), export: doExport, macro: false }
    } else {
        // id
        const id = requireType(tokenizer.cur(), "TOKEN_ID");
        tokenizer.next()

        // =
        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "=")
        tokenizer.next()

        return { type: "NODE_DECL_SINGLE", id, val: parseExpr(tokenizer), export: doExport, macro: false }
    }
}

function parseIf(tokenizer: Tokenizer): Node {
    tokenizer.next() // eat if

    const cond = parseExpr(tokenizer)
    const stmts = parseBlock(tokenizer)

    return { type: "NODE_IF", cond, stmts }
}

function parseFor(tokenizer: Tokenizer): Node {
    // for
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "for")
    tokenizer.next()

    // item
    const item = requireType(tokenizer.cur(), "TOKEN_ID")
    tokenizer.next()

    // in
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "in")
    tokenizer.next()

    // iter
    const iter = parseExpr(tokenizer)

    // stmts
    const stmts = parseBlock(tokenizer)

    return { type: "NODE_FOR", item, iter, stmts }
}

function parseWhile(tokenizer: Tokenizer): Node {
    // while
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "while")
    tokenizer.next()

    // expr
    const expr = parseExpr(tokenizer)

    // stmts
    const stmts = parseBlock(tokenizer)

    return { type: "NODE_WHILE", cond: expr, stmts }
}

function parseBreak(tokenizer: Tokenizer): Node {
    tokenizer.next()
    return { type: "NODE_BREAK" }
}

function parseReturn(tokenizer: Tokenizer): Node {
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "return")
    tokenizer.next()

    const first = tokenizer.cur()

    if (first.type === "TOKEN_SYMBOL") {
        // Multiple return values

        const vals: Node[] = []

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
        tokenizer.next()

        let token = tokenizer.cur()

        while(!(token.type === "TOKEN_SYMBOL" && token.val === "}")) {
            vals.push(parseExpr(tokenizer))
            token = tokenizer.cur()
        }

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "}")
        tokenizer.next()

        return { type: "NODE_RETURN_MULTI", vals }
    } else {
        // Single return value

        return { type: "NODE_RETURN_SINGLE", val: parseExpr(tokenizer) }
    }
}

function parseModImport(tokenizer: Tokenizer): Node {
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "import")
    tokenizer.next()

    const path: IdToken[] = [requireType(tokenizer.cur(), "TOKEN_ID")]
    tokenizer.next()

    let cur = tokenizer.cur();

    while (cur.type === "TOKEN_SYMBOL" && cur.val === ".") {
        tokenizer.next()

        path.push(requireType(tokenizer.cur(), "TOKEN_ID"))
        tokenizer.next()

        cur = tokenizer.cur()
    }

    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "as")
    tokenizer.next()

    const id = requireType(tokenizer.cur(), "TOKEN_ID")
    tokenizer.next()

    return { type: "NODE_IMPORT_MOD", path, id }
}

function parseVarImport(tokenizer: Tokenizer): VarImportNode {
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "from")
    tokenizer.next()

    const path: IdToken[] = [requireType(tokenizer.cur(), "TOKEN_ID")]
    tokenizer.next()

    {
        let cur = tokenizer.cur();

        while (cur.type === "TOKEN_SYMBOL" && cur.val === ".") {
            tokenizer.next()

            path.push(requireType(tokenizer.cur(), "TOKEN_ID"))
            tokenizer.next()

            cur = tokenizer.cur()
        }
    }

    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "import")
    tokenizer.next()

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
    tokenizer.next()

    const ids: IdToken[] = []

    {
        let cur = tokenizer.cur();

        while (cur.type !== "TOKEN_EOF" && !(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
            ids.push(requireType(tokenizer.cur(), "TOKEN_ID"))
            tokenizer.next()

            cur = tokenizer.cur()
        }
    }

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "}")
    tokenizer.next()

    return { type: "NODE_IMPORT_VARS", path, ids }
}

function parseStmt(tokenizer: Tokenizer): Node {
    const cur = tokenizer.cur()

    if (!cur) {
        throw Error("PARSESTMT")
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "var") {
        return parseDecl(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "if") {
        return parseIf(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "for") {
        return parseFor(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "while") {
        return parseWhile(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "break") {
        return parseBreak(tokenizer) 
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "return") {
        return parseReturn(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "import") {
        return parseModImport(tokenizer)
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "from") {
        return parseVarImport(tokenizer)
    }

    return parseAssig(tokenizer)
}

export function parse(tokenizer: Tokenizer): Node {
    const stmts: Node[] = []

    while(tokenizer.cur().type !== "TOKEN_EOF") {
        stmts.push(parseStmt(tokenizer))
    }

    return { type: "NODE_ROOT", stmts }
}
