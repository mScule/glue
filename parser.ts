import { createError } from "./error.ts";
import { Tokenizer, BoolToken, IdToken, NullToken, NumberToken, StringToken, SymbolToken, Token, KeywordToken } from "./tokenizer.ts";
import { Nullable } from "./nullable.ts";

type AstNode<T extends string> = { type: T }

export type ListNode = AstNode<"NODE_LIST"> & { items: ExprNode[] }
export type DictNode = AstNode<"NODE_DICT"> & { fields: { key: NumberToken | StringToken | IdToken, value: ExprNode }[] }
export type FuncNode = AstNode<"NODE_FUNC"> & { params: IdToken[], stmts: StmtNode[] }

export type FuncCallNode  = AstNode<"NODE_FUNC_CALL">  & { args: ExprNode[] }
export type FieldCallNode =
    | AstNode<"NODE_FIELD_CALL"> & { variant: "PRIMITIVE", field: NumberToken | StringToken | IdToken }
    | AstNode<"NODE_FIELD_CALL"> & { variant: "COMPOSITE", expr: ExprNode }

export type PrimaryNode =
    | AstNode<"NODE_PRIMARY"> & { variant: "PRIMITIVE", token: NullToken | BoolToken | NumberToken | StringToken | IdToken }
    | AstNode<"NODE_PRIMARY"> & { variant: "COMPOSITE", node: ListNode | DictNode | FuncNode | ExprNode }

export type CallNode    = AstNode<"NODE_CALL">    & { primary: PrimaryNode, calls: (FuncCallNode | FieldCallNode)[] } 
export type UnaryNode   = AstNode<"NODE_UNARY">   & { next: CallNode } | { opr: SymbolToken, next: UnaryNode }

export type FactorNode = AstNode<"NODE_FACTOR"> & { left: UnaryNode }  | { opr: SymbolToken, left: UnaryNode,  right: FactorNode }
export type TermNode   = AstNode<"NODE_TERM">   & { left: FactorNode } | { opr: SymbolToken, left: FactorNode, right: TermNode }
export type CompNode   = AstNode<"NODE_COMP">   & { left: TermNode }   | { opr: SymbolToken, left: TermNode,   right: CompNode }
export type EqNode     = AstNode<"NODE_EQ">     & { left: CompNode }   | { opr: SymbolToken, left: CompNode,   right: EqNode }
export type AndNode    = AstNode<"NODE_AND">    & { left: EqNode,  right?: AndNode }
export type OrNode     = AstNode<"NODE_OR">     & { left: AndNode, right?: OrNode }
export type ExprNode   = AstNode<"NODE_EXPR">   & { node: OrNode }

export type AssigNode  = AstNode<"NODE_ASSIG"> & { left: ExprNode, right?: ExprNode }
export type DeclNode   = AstNode<"NODE_DECL">  & { id:   IdToken,  value:  ExprNode }
export type IfNode     = AstNode<"NODE_IF">    & { cond: ExprNode, stmts:  StmtNode[] }
export type ForNode    = AstNode<"NODE_FOR">   & { item: IdToken,  source: ExprNode, stmts: StmtNode[] }
export type WhileNode  = AstNode<"NODE_WHILE"> & { cond: ExprNode, stmts:  StmtNode[] }
export type BreakNode  = AstNode<"NODE_BREAK">
export type ReturnNode = AstNode<"NODE_RETURN"> & { value: ExprNode }

export type StmtNode = AstNode<"NODE_STMT"> & { node: AssigNode | DeclNode | IfNode | ForNode | WhileNode | BreakNode | ReturnNode }

export type AstRoot = AstNode<"NODE_ROOT"> & { stmts: StmtNode[] }

function assertToken(candidate: Nullable<Token>): Token {
    if (!candidate) {
        throw createError("Unexpected EOF")
    }

    return candidate
}

function assertKeyword(candidate: Nullable<Token>, keyword: string): KeywordToken {
    const token = assertToken(candidate)

    if (token.type !== "TOKEN_KEYWORD" || token.val !== keyword) {
        throw createError(`Expected keyword ${keyword} got ${JSON.stringify(token)}`, token.loc)
    }

    return token
}

function assertSymbol(candidate: Nullable<Token>, symbol: string): SymbolToken {
    const token = assertToken(candidate)

    if (token.type !== "TOKEN_SYMBOL" || token.val !== symbol) {
        throw createError(`Expected keyword ${symbol} got ${JSON.stringify(token)}`, token.loc)
    }

    return token
}

function parseStmtBlock(tokenizer: Tokenizer): StmtNode[] {
    const stmts: StmtNode[] = []

    assertSymbol(tokenizer.cur(), "{")
    tokenizer.next() // Eat opening {

    let cur = tokenizer.cur()

    while (cur && !(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        stmts.push(parseStmt(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next() // Eat closing }

    return stmts
}

function parseList(tokenizer: Tokenizer): ListNode {
    const items: ExprNode[] = []

    assertKeyword(tokenizer.cur(), "list")
    tokenizer.next()

    assertSymbol(tokenizer.cur(), "{")
    tokenizer.next()

    let cur = tokenizer.cur()

    while (cur && !(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        items.push(parseExpr(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_LIST", items }
}

function parseDict(tokenizer: Tokenizer): DictNode {
    const fields: { key: NumberToken | StringToken | IdToken, value: ExprNode }[] = []

    assertKeyword(tokenizer.cur(), "dict")
    tokenizer.next()

    assertSymbol(tokenizer.cur(), "{")
    tokenizer.next()

    let cur = tokenizer.cur()

    while (cur && !(cur.type === "TOKEN_SYMBOL" && cur.val === "}")) {
        const key = assertToken(cur)

        if (!(key.type === "TOKEN_NUMBER" || key.type === "TOKEN_STRING" || key.type ==="TOKEN_ID")) {
            throw createError(`Dict key has to be either number, string, or id but got ${key.type}`, key.loc)
        }

        tokenizer.next()

        assertSymbol(tokenizer.cur(), "=")
        tokenizer.next()

        const value = parseExpr(tokenizer)

        fields.push({ key, value })

        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_DICT", fields }
}

function parseFunc(tokenizer: Tokenizer): FuncNode {
    const params: IdToken[] = []

    let cur = tokenizer.cur()

    assertKeyword(tokenizer.cur(), "func")
    tokenizer.next()

    // Params

    assertSymbol(tokenizer.cur(), "(")
    tokenizer.next()

    cur = tokenizer.cur()

    while (cur && !(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
        const token = assertToken(cur)

        if (token.type !== "TOKEN_ID") {
            throw createError(`Function parameter declarations has to be ids. Got ${JSON.stringify(token)}`, token.loc)
        }

        params.push(token)
        tokenizer.next()

        cur = tokenizer.cur()
    }

    tokenizer.next()

    // Stmts

    const stmts = parseStmtBlock(tokenizer)

    return { type: "NODE_FUNC", params, stmts }
}

function parseFuncCall(tokenizer: Tokenizer): FuncCallNode {
    tokenizer.next() // eat "sticky" (

    const args: ExprNode[] = []

    let cur = tokenizer.cur()

    while (cur && !(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
        args.push(parseExpr(tokenizer))
        cur = tokenizer.cur()
    }

    tokenizer.next()

    return { type: "NODE_FUNC_CALL", args }
}

function parseFieldCall(tokenizer: Tokenizer): FieldCallNode {
    tokenizer.next() // eat "."

    const cur = tokenizer.cur()

    if (cur && (cur.type === "TOKEN_NUMBER" || cur.type === "TOKEN_STRING" || cur.type === "TOKEN_ID")) {
        tokenizer.next() // eat field
        return { type: "NODE_FIELD_CALL", variant: "PRIMITIVE", field: cur }
    }

    if (cur && cur.type === "TOKEN_STICKY_PAREN_L") {
        tokenizer.next() // eat sticky (
        const expr = parseExpr(tokenizer)
        const cur = tokenizer.cur()
        if (!cur || !(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
            throw createError("Field call expression has to be closed with ) got " + cur, cur?.loc)
        }
        tokenizer.next() // eat )
        return { type: "NODE_FIELD_CALL", variant: "COMPOSITE", expr: expr }
    }

    throw createError("Field accessor has to be either number, string, id or expression wrapped in sticky opening parenthese and closing parenthese")
}

function parsePrimary(tokenizer: Tokenizer): PrimaryNode {
    const cur = tokenizer.cur()

    if (cur && (cur.type === "TOKEN_NULL" || cur.type === "TOKEN_BOOL" || cur.type === "TOKEN_NUMBER" || cur.type === "TOKEN_STRING" || cur.type === "TOKEN_ID")) {
        tokenizer.next()
        return { type: "NODE_PRIMARY", variant: "PRIMITIVE", token: cur }
    }

    if (cur && cur.type === "TOKEN_KEYWORD" && cur.val === "list") {
        return { type: "NODE_PRIMARY", variant: "COMPOSITE", node: parseList(tokenizer) }
    }

    if (cur && cur.type === "TOKEN_KEYWORD" && cur.val === "dict") {
        return { type: "NODE_PRIMARY", variant: "COMPOSITE", node: parseDict(tokenizer) }
    }

    if (cur && cur.type === "TOKEN_KEYWORD" && cur.val === "func") {
        return { type: "NODE_PRIMARY", variant: "COMPOSITE", node: parseFunc(tokenizer) }
    }

    if (cur && cur.type === "TOKEN_SYMBOL" && cur.val === "(") {
        tokenizer.next() // eat non sticky (
        const expr = parseExpr(tokenizer)

        const cur = tokenizer.cur()

        if (!cur || !(cur.type === "TOKEN_SYMBOL" && cur.val === ")")) {
            throw createError("Func call expression has to be closed with ) got " + cur, cur?.loc)
        }

        tokenizer.next()

        return { type: "NODE_PRIMARY", variant: "COMPOSITE", node: expr }
    }

    throw createError("Primary has to be either null, bool, number, string, id, list, dict, func, or expression wrapped in non sticky opening parenthese and closing parenthese got " + JSON.stringify(cur))
}

function parseCall(tokenizer: Tokenizer): CallNode {
    const primary = parsePrimary(tokenizer)
    const calls: (FuncCallNode | FieldCallNode)[] = []

    let cur = tokenizer.cur()

    while (cur && (cur.type === "TOKEN_STICKY_PAREN_L" || (cur.type === "TOKEN_SYMBOL" && cur.val === "."))) {
        if (cur && cur.type === "TOKEN_STICKY_PAREN_L") {
            calls.push(parseFuncCall(tokenizer))
        } else {
            calls.push(parseFieldCall(tokenizer))
        }

        cur = tokenizer.cur()
    }

    return { type: "NODE_CALL", primary, calls }
}

function parseUnary(tokenizer: Tokenizer): UnaryNode {
    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && (cur.val === "!" || cur.val === "-")) {
        tokenizer.next()
        return { type: "NODE_UNARY", opr: cur, next: parseUnary(tokenizer) }
    }

    return { type: "NODE_UNARY", next: parseCall(tokenizer) }
}

function parseFactor(tokenizer: Tokenizer): FactorNode {
    const left = parseUnary(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && (cur.val === "*" || cur.val === "/" || cur.val === "%")) {
        tokenizer.next()
        return { type: "NODE_FACTOR", opr: cur, left, right: parseFactor(tokenizer) }
    }

    return { type: "NODE_FACTOR", left }
}

function parseTerm(tokenizer: Tokenizer): TermNode {
    const left = parseFactor(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && (cur.val === "+" || cur.val === "-")) {
        tokenizer.next()
        return { type: "NODE_TERM", opr: cur, left, right: parseTerm(tokenizer) }
    }

    return { type: "NODE_TERM", left }
}

function parseComp(tokenizer: Tokenizer): CompNode {
    const left = parseTerm(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && (cur.val === ">" || cur.val === "<" || cur.val === ">=" || cur.val === "<=")) {
        tokenizer.next()
        return { type: "NODE_COMP", opr: cur, left, right: parseComp(tokenizer) }
    }

    return { type: "NODE_COMP", left }
}

function parseEq(tokenizer: Tokenizer): EqNode {
    const left = parseComp(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && (cur.val === "!=" || cur.val === "==")) {
        tokenizer.next()
        return { type: "NODE_EQ", opr: cur, left, right: parseEq(tokenizer) }
    }

    return { type: "NODE_EQ", left }
}

function parseAnd(tokenizer: Tokenizer): AndNode {
    const left = parseEq(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_KEYWORD" && cur.val === "and") {
        tokenizer.next()
        return { type: "NODE_AND", left, right: parseAnd(tokenizer) }
    }

    return { type: "NODE_AND", left }
}

function parseOr(tokenizer: Tokenizer): OrNode {
    const left = parseAnd(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_KEYWORD" && cur.val === "or") {
        tokenizer.next()
        return { type: "NODE_OR", left, right: parseOr(tokenizer) }
    }

    return { type: "NODE_OR", left }
}

function parseExpr(tokenizer: Tokenizer): ExprNode {
    const node = parseOr(tokenizer)

    return { type: "NODE_EXPR", node }
}

function parseAssig(tokenizer: Tokenizer): AssigNode {
    const left = parseExpr(tokenizer)

    const cur = tokenizer.cur()

    if (cur && cur.type === "TOKEN_SYMBOL" && cur.val === "=") {
        tokenizer.next()
        return { type: "NODE_ASSIG", left, right: parseExpr(tokenizer) }
    }

    return { type: "NODE_ASSIG", left }
}

function parseDecl(tokenizer: Tokenizer): DeclNode {
    assertKeyword(tokenizer.cur(), "var")
    tokenizer.next()

    const id = assertToken(tokenizer.cur())

    if (id.type !== "TOKEN_ID") {
        throw createError(`ID has to be given to variable declaration. Got ${JSON.stringify(id)}`, id.loc)
    }

    tokenizer.next()

    assertSymbol(tokenizer.cur(), "=")
    tokenizer.next()

    const expr = parseExpr(tokenizer)

    return { type: "NODE_DECL", id, value: expr }
}

function parseIf(tokenizer: Tokenizer): IfNode {
    tokenizer.next() // eat if

    const cond = parseExpr(tokenizer)
    const stmts = parseStmtBlock(tokenizer)

    return { type: "NODE_IF", cond, stmts }
}

function parseFor(tokenizer: Tokenizer): ForNode {
    // for

    assertKeyword(tokenizer.cur(), "for")
    tokenizer.next()

    // item

    const item = assertToken(tokenizer.cur())

    if (item.type !== "TOKEN_ID") {
        throw createError(`Item has to be given as id to for ... in {} statement. Got ${JSON.stringify(item)}`, item.loc)
    }

    tokenizer.next()

    // in

    assertKeyword(tokenizer.cur(), "in")
    tokenizer.next()

    const source = parseExpr(tokenizer)

    // stmts

    const stmts = parseStmtBlock(tokenizer)

    return { type: "NODE_FOR", item, source, stmts }
}

function parseWhile(tokenizer: Tokenizer): WhileNode {
    // while
    tokenizer.next() // eat while

    // expr
    const expr = parseExpr(tokenizer)

    // stmts
    const stmts = parseStmtBlock(tokenizer)

    return { type: "NODE_WHILE", cond: expr, stmts }
}

function parseBreak(tokenizer: Tokenizer): BreakNode {
    tokenizer.next()
    return { type: "NODE_BREAK" }
}

function parseReturn(tokenizer: Tokenizer): ReturnNode {
    tokenizer.next()
    return { type: "NODE_RETURN", value: parseExpr(tokenizer) }
}

function parseStmt(tokenizer: Tokenizer): StmtNode {
    const cur = tokenizer.cur()

    if (!cur) {
        throw Error("PARSESTMT")
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "var") {
        return { type: "NODE_STMT", node: parseDecl(tokenizer) }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "if") {
        return { type: "NODE_STMT", node: parseIf(tokenizer) }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "for") {
        return { type: "NODE_STMT", node: parseFor(tokenizer) }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "while") {
        return { type: "NODE_STMT", node: parseWhile(tokenizer) }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "break") {
        return { type: "NODE_STMT", node: parseBreak(tokenizer) }
    }

    if (cur.type === "TOKEN_KEYWORD" && cur.val === "return") {
        return { type: "NODE_STMT", node: parseReturn(tokenizer) }
    }

    return { type: "NODE_STMT", node: parseAssig(tokenizer) }
}

export function parse(tokenizer: Tokenizer): AstRoot {
    const stmts: StmtNode[] = []

    while(tokenizer.cur()) {
        stmts.push(parseStmt(tokenizer))
    }

    return { type: "NODE_ROOT", stmts }
}
