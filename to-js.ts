import { Compiler } from "./compiler.ts";

export const compile: Compiler<string> = function (ast) {
    switch(ast.type) {
        case "NODE_PRIM":
            return (() => {
                switch(ast.val.type) {
                    case "TOKEN_NULL":
                        return "null"
                    case "TOKEN_STRING":
                        return "\"" + ast.val.val + "\""
                    case "TOKEN_BOOL":
                    case "TOKEN_NUMBER":
                    case "TOKEN_ID":
                        return ast.val.val
                }
            })()
        case "NODE_LIST":
            return [
                "[", ast.vals.map(val => compile(val)).join(","), "]"
            ].join("")
        case "NODE_DICT":
            return [
                "{",
                ast.vals.map(({ key, val }) => {
                    const compiledKey = (() => {
                        switch(key.type) {
                            case "TOKEN_NUMBER":
                            case "TOKEN_STRING":
                                return "[" + key.val + "]"
                            case "TOKEN_ID":
                                return key.val
                        }
                    })()
                    return compiledKey + ":" + compile(val)
                }).join(","),
                "}"
            ].join("")
        case "NODE_FUNC":
            return [
                "function", "(", ast.params.map(param => param.val), ")", "{",
                ast.stmts.map(stmt => compile(stmt)).join(";"),
                "}"
            ].join(" ")
        case "NODE_PIPE":
            return [
                "(", "function", "(", ast.target.val, ")", "{",
                ast.stmts.map(stmt => compile(stmt)).join(";"),
                "}", ")"
            ].join("")
        case "NODE_CALL":
            return [
                "(",
                ast.args.map(arg => compile(arg)).join(","),
                ")"
            ].join("")
        case "NODE_PIPE_CALL":
            return [
                compile(ast.pipe),
                "(",
                compile(ast.target),
                ")"
            ].join("")
        case "NODE_ACCESS":
            return [
                compile(ast.origin),
                ".",
                ast.props.map(p => compile(p)).join("")
            ].join("")
        case "NODE_UNARY":
            return [
                ast.opr.val,
                compile(ast.expr)
            ].join(" ")
        case "NODE_BINARY":
            return [
                compile(ast.left),
                ast.opr.val,
                compile(ast.right)
            ].join(" ")
        case "NODE_IF":
            return [
                "if", "(", compile(ast.cond), ")", "{",
                ast.stmts.map(stmt => compile(stmt)).join(";"),
                "}"
            ].join(" ")
        case "NODE_WHILE":
            return [
                "while", "(", compile(ast.cond), ")", "{",
                ast.stmts.map(stmt => compile(stmt)).join(";"),
                "}"
            ].join(" ")
        case "NODE_FOR":
            return [
                "for", "(", "let", ast.item.val, "of", compile(ast.iter), ")", "{",
                ast.stmts.map(stmt => compile(stmt)).join(";"),
                "}"
            ].join("")
        case "NODE_RETURN_SINGLE":
            return [
                "return", compile(ast.val)
            ].join(" ")
        case "NODE_RETURN_MULTI":
            return [
                "return", "[", ast.vals.map(v => compile(v)).join(","), "]"
            ].join(" ")
        case "NODE_BREAK":
            return "break"
        case "NODE_ASSIG":
            return [
                compile(ast.target), "=", compile(ast.val)
            ].join(" ")
        case "NODE_DECL_VAR_SINGLE":
            return [
                ast.export ? "export" : null,
                "let", ast.id.val, "=", compile(ast.val)
            ].filter(t => t !== null).join(" ")
        case "NODE_DECL_VAR_MULTI":
            return [
                "let", "[", ast.ids.map(id => id.val).join(","), "]", "=",
                compile(ast.val)
            ].join(" ")
        case "NODE_IMPORT_MOD":
            return [
                "import", "*", "as", ast.id.val, "from",
                "\"" + ast.path.map(p => p.val).join("/") + "\""
            ].join(" ")
        case "NODE_IMPORT_VARS":
            return [
                "import", "{", ast.ids.map(id => id.val).join(","), "}", "from",
                "\"" + ast.path.map(p => p.val).join("/") + "\""
            ].join(" ")
        case "NODE_MODULE":
            return ast.stmts.map(stmt => compile(stmt)).join(";")
    }
}
