import { createError } from "./error.ts";
import { Tokenizer, BoolToken, IdToken, NullToken, NumberToken, StringToken, SymbolToken, Token, stringifyToken, TokenOfType, KeywordToken } from "./tokenizer.ts";

// Literals

export type PrimNode = { type: "NODE_PRIM", val: NullToken | BoolToken | NumberToken | StringToken | IdToken }
export type ListNode = { type: "NODE_LIST", vals: Node[] }
export type DictNode = { type: "NODE_DICT", vals: { key: NumberToken | StringToken | IdToken, val: Node }[] }

export type FuncNode = { type: "NODE_FUNC", params: IdToken[], stmts: Node[] }
export type PipeNode = { type: "NODE_PIPE", target: IdToken,   stmts: Node[] }

// Expressions

export type AssigNode    = { type: "NODE_ASSIG",     target: Node, val: Node }
export type AccessNode   = { type: "NODE_ACCESS",    origin: Node, props: Node[]  }
export type CallNode     = { type: "NODE_CALL",      args: Node[] }
export type PipeCallNode = { type: "NODE_PIPE_CALL", target: Node, pipe: Node }

export type UnaryNode    = { type: "NODE_UNARY",  opr: SymbolToken, expr: Node }
export type BinaryNode   = { type: "NODE_BINARY", opr: SymbolToken | KeywordToken, left: Node, right: Node }

// Compound statements

export type IfNode    = { type: "NODE_IF",    cond: Node, stmts: Node[] }
export type WhileNode = { type: "NODE_WHILE", cond: Node, stmts: Node[] }
export type ForNode   = { type: "NODE_FOR",   item: IdToken, iter: Node, stmts: Node[] }

// Control flow

export type SingleReturnNode = { type: "NODE_RETURN_SINGLE", val: Node    }
export type MultiReturnNode  = { type: "NODE_RETURN_MULTI",  vals: Node[] }
export type BreakNode        = { type: "NODE_BREAK" }

// Declaration

export type SingleVarDeclNode = { type: "NODE_DECL_VAR_SINGLE", id:  IdToken,   val: Node, export: boolean }
export type MultiVarDeclNode  = { type: "NODE_DECL_VAR_MULTI",  ids: IdToken[], val: Node, export: boolean }

// Module

export type ModImportNode = { type: "NODE_IMPORT_MOD",  path: IdToken[], id: IdToken    };
export type VarImportNode = { type: "NODE_IMPORT_VARS", path: IdToken[], ids: IdToken[] };
export type ModuleNode    = { type: "NODE_MODULE", stmts: Node[] }

export type Node =
    | PrimNode         | ListNode        | DictNode   | FuncNode  | PipeNode
    | CallNode         | PipeCallNode    | AccessNode | UnaryNode | BinaryNode
    | IfNode           | WhileNode       | ForNode
    | SingleReturnNode | MultiReturnNode | BreakNode
    | AssigNode
    | SingleVarDeclNode | MultiVarDeclNode
    | ModImportNode     | VarImportNode    | ModuleNode

// Utils

function isType<T extends Token["type"]>(candidate: Token, type: T | T[]): TokenOfType<T> | null {
    if (typeof type === "object") {
        for (const t of type) {
            if (candidate.type === t) {
                return candidate as TokenOfType<T>
            }
        }
        return null
    } else {
        if (candidate.type !== type) {
            return null
        }
        return candidate as TokenOfType<T>
    }
}

function isValueOfType<T extends Token["type"]>(candidate: Token, type: T, val: string | string[]): TokenOfType<T> | null {
    const sameType = isType(candidate, type)
    const sameVal = typeof val === "string"
        ? "val" in candidate && candidate.val === val
        : val.find(val => "val" in candidate && candidate.val === val)

    const isIdentical = sameType && sameVal

    if (!isIdentical) {
        return null
    }

    return candidate as TokenOfType<T>
}

function requireType<T extends Token["type"]>(candidate: Token, type: T): TokenOfType<T> {
    const fillsRequirements = isType(candidate, type)

    if (!fillsRequirements) {
        throw createError(`Expected token of type ${type}, got type ${candidate.type} instead`, candidate.loc);
    }

    return candidate as TokenOfType<T>
}

function requireValueOfType<T extends Token["type"]>(candidate: Token, type: T, val: string | string[]): TokenOfType<T> {
    const fillsRequirements = isValueOfType(candidate, type, val)

    if (!fillsRequirements) {
        throw createError(`Expected token of with value ${val}, got value ${stringifyToken(candidate)} instead`, candidate.loc)
    }

    return candidate as TokenOfType<T>
}

// Rules

function parseBlock(tokenizer: Tokenizer): Node[] {
    const stmts: Node[] = []

    requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
    tokenizer.next() // Eat opening {

    let cur = tokenizer.cur()

    while (!isValueOfType(cur, "TOKEN_SYMBOL", "}")) {
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

    while (!isValueOfType(cur, "TOKEN_SYMBOL", "}")) {
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

    while (!isValueOfType(cur, "TOKEN_SYMBOL", "}")) {
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

    while (!isValueOfType(cur, "TOKEN_SYMBOL", ")")) {
        const id = isType(tokenizer.cur(), "TOKEN_ID")

        if (!id) {
            throw createError(`Function parameter declarations has to be ids. Got ${JSON.stringify(tokenizer.cur())}`, tokenizer.cur().loc)
        }

        params.push(id)
        tokenizer.next()

        cur = tokenizer.cur()
    }

    tokenizer.next()

    // Stmts

    const stmts = parseBlock(tokenizer)

    return { type: "NODE_FUNC", params, stmts }
}

function parsePipe(tokenizer: Tokenizer): Node {
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "pipe")
    tokenizer.next()

    const target = requireType(tokenizer.cur(), "TOKEN_ID")
    tokenizer.next()

    const stmts = parseBlock(tokenizer)

    return { type: "NODE_PIPE", target, stmts }
}

function parseFuncCall(tokenizer: Tokenizer): Node {
    tokenizer.next() // eat "sticky" (

    const args: Node[] = []

    let cur = tokenizer.cur()

    while (!isValueOfType(cur, "TOKEN_SYMBOL", ")")) {
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

    const primitive = isType(cur, ["TOKEN_NUMBER", "TOKEN_STRING", "TOKEN_ID"])

    if (primitive) {
        tokenizer.next()
        return { type: "NODE_PRIM", val: primitive }
    }

    // Expression

    if (isType(cur, "TOKEN_STICKY_PAREN_L")) {
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

    const primitive = isType(cur, ["TOKEN_NULL", "TOKEN_BOOL", "TOKEN_NUMBER", "TOKEN_STRING", "TOKEN_ID"])

    if (primitive) {
        tokenizer.next()
        return { type: "NODE_PRIM", val: primitive }
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "list")) {
        return parseList(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "dict")) {
        return parseDict(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "func")) {
        return parseFunc(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "pipe")) {
        return parsePipe(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_SYMBOL", "(")) {
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

    while (true) {
        if (isType(cur, "TOKEN_STICKY_PAREN_L")) {
            props.push(parseFuncCall(tokenizer))
        } else if (isValueOfType(cur, "TOKEN_SYMBOL", ".")) {
            props.push(parseFieldCall(tokenizer))
        } else {
            break;
        }

        cur = tokenizer.cur()
    }

    if (props.length === 0) {
        return origin
    }

    return { type: "NODE_ACCESS", origin, props }
}

function parsePipeCall(tokenizer: Tokenizer): Node {
    const target = parseCall(tokenizer);

    if (isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "|")) {
        tokenizer.next();
        return { type: "NODE_PIPE_CALL", target, pipe: parsePipeCall(tokenizer) }
    }

    return target;
}

function parseUnary(tokenizer: Tokenizer): Node {
    const opr = isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", ["!", "-"])

    if (opr) {
        tokenizer.next()
        return { type: "NODE_UNARY", opr, expr: parseUnary(tokenizer) }
    }

    return parsePipeCall(tokenizer)
}

function parseFactor(tokenizer: Tokenizer): Node {
    const left = parseUnary(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", ["*", "/", "%"])

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseFactor(tokenizer) }
    }

    return left
}

function parseTerm(tokenizer: Tokenizer): Node {
    const left = parseFactor(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", ["+", "-"])

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseTerm(tokenizer) }
    }

    return left
}

function parseComp(tokenizer: Tokenizer): Node {
    const left = parseTerm(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", [">", "<", ">=", "<="])

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseComp(tokenizer) }
    }

    return left
}

function parseEq(tokenizer: Tokenizer): Node {
    const left = parseComp(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", ["!=", "=="])

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseEq(tokenizer) }
    }

    return left
}

function parseAnd(tokenizer: Tokenizer): Node {
    const left = parseEq(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "and")

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseAnd(tokenizer) }
    }

    return left
}

function parseOr(tokenizer: Tokenizer): Node {
    const left = parseAnd(tokenizer)

    const opr = isValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "or")

    if (opr) {
        tokenizer.next()
        return { type: "NODE_BINARY", opr, left, right: parseOr(tokenizer) }
    }

    return left
}

function parseExpr(tokenizer: Tokenizer): Node {
    return parseOr(tokenizer)
}

function parseAssig(tokenizer: Tokenizer): Node {
    const target = parseExpr(tokenizer)

    const cur = tokenizer.cur()

    if (isValueOfType(cur, "TOKEN_SYMBOL", "=")) {
        tokenizer.next()
        return { type: "NODE_ASSIG", target, val: parseExpr(tokenizer) }
    }

    return target
}

function parseVarDecl(tokenizer: Tokenizer): Node {
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

    if (isType(tokenizer.cur(), "TOKEN_SYMBOL")) {
        // { ids* }

        const ids: IdToken[] = []

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
        tokenizer.next()

        let token = tokenizer.cur()

        while (!isValueOfType(token, "TOKEN_SYMBOL", "}")) {
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

        return { type: "NODE_DECL_VAR_MULTI", ids, val: parseExpr(tokenizer), export: doExport }
    } else {
        // id
        const id = requireType(tokenizer.cur(), "TOKEN_ID");
        tokenizer.next()

        // =
        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "=")
        tokenizer.next()

        return { type: "NODE_DECL_VAR_SINGLE", id, val: parseExpr(tokenizer), export: doExport }
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

    if (isType(first, "TOKEN_SYMBOL")) {
        // Multiple return values

        const vals: Node[] = []

        requireValueOfType(tokenizer.cur(), "TOKEN_SYMBOL", "{")
        tokenizer.next()

        let token = tokenizer.cur()

        while(!isValueOfType(token, "TOKEN_SYMBOL", "}")) {
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

    while (isValueOfType(cur, "TOKEN_SYMBOL", ".")) {
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

function parseVarImport(tokenizer: Tokenizer): Node {
    requireValueOfType(tokenizer.cur(), "TOKEN_KEYWORD", "from")
    tokenizer.next()

    const path: IdToken[] = [requireType(tokenizer.cur(), "TOKEN_ID")]
    tokenizer.next()

    {
        let cur = tokenizer.cur();

        while (isValueOfType(cur, "TOKEN_SYMBOL", ".")) {
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

        while (!isType(cur, "TOKEN_EOF") && !isValueOfType(cur, "TOKEN_SYMBOL", "}")) {
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

    if (isValueOfType(cur, "TOKEN_KEYWORD", ["var", "export"])) {
        return parseVarDecl(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "if")) {
        return parseIf(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "for")) {
        return parseFor(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "while")) {
        return parseWhile(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "break")) {
        return parseBreak(tokenizer) 
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "return")) {
        return parseReturn(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "import")) {
        return parseModImport(tokenizer)
    }

    if (isValueOfType(cur, "TOKEN_KEYWORD", "from")) {
        return parseVarImport(tokenizer)
    }

    return parseAssig(tokenizer)
}

export function parse(tokenizer: Tokenizer): Node {
    const stmts: Node[] = []

    while(!isType(tokenizer.cur(),"TOKEN_EOF")) {
        stmts.push(parseStmt(tokenizer))
    }

    return { type: "NODE_MODULE", stmts }
}
