import { AstRoot, DictNode, FieldCallNode, FuncCallNode, FuncNode, ListNode } from "./parser.ts";

function compileList(node: ListNode): string {
    return `[${node.items.map(item => compileExpr(item)).join(",")}]`
}
function compileDict(node: DictNode): string {
    return `{${node.fields.map(field => `${field.key.val}:${compileExpr(field.value)}`).join(",")}}`
}
function compileFunc(node: FuncNode): string {
    return `function(${node.params.map(param => param.val).join(",")}){${node.stmts.map(stmt => compileStmt(stmt))}}`
}

function compileFuncCall(node: FuncCallNode): string {
    return `(${node.args.map(arg => compileExpr(arg)).join(",")})`
}


export function compileToJs(root: AstRoot): string {
    return ""
}
