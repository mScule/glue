// import { createError } from "./error.ts";
// import {
//   AndNode,
//   AssigNode,
//   AstRoot,
//   BreakNode,
//   CallNode,
//   CompNode,
//   DeclNode,
//   DictNode,
//   EqNode,
//   ExprNode,
//   FactorNode,
//   FieldCallNode,
//   ForNode,
//   FuncCallNode,
//   FuncNode,
//   IfNode,
//   ListNode,
//   ModImportNode,
//   OrNode,
//   PrimaryNode,
//   ReturnNode,
//   StmtNode,
//   TermNode,
//   UnaryNode,
//   VarImportNode,
//   WhileNode,
// } from "./parser.ts";

// let moduleExports: string[] = []

// function compileList(node: ListNode): string {
//   return `[${node.items.map((item) => compileExpr(item)).join(",")}]`;
// }
// function compileDict(node: DictNode): string {
//   return `{${node.fields.map((field) => `${field.key.val}:${compileExpr(field.value)}`).join(",")}}`;
// }
// function compileFunc(node: FuncNode): string {
//   return `function(${node.params.map((param) => param.val).join(",")}){${node.stmts.map((stmt) => compileStmt(stmt)).join(";")}}`;
// }

// function compileFuncCall(node: FuncCallNode): string {
//   return `(${node.args.map((arg) => compileExpr(arg)).join(",")})`;
// }

// function compileFieldCall(node: FieldCallNode): string {
//   switch (node.variant) {
//     case "PRIMITIVE":
//       switch (node.field.type) {
//         case "TOKEN_NUMBER":
//         case "TOKEN_STRING":
//           return "[\"" + node.field.val + "\"]";
//         case "TOKEN_ID":
//           return "." + node.field.val;
//       }
//       break;
//     case "COMPOSITE":
//       return "[" + compileExpr(node.expr) + "]";
//   }
// }

// function compilePrimary(node: PrimaryNode): string {
//   switch(node.variant) {
//     case "PRIMITIVE":
//       switch(node.token.type) {
//         case "TOKEN_NUMBER":
//           return node.token.val
//         case "TOKEN_STRING":
//           return "\"" + node.token.val + "\""
//         case "TOKEN_ID":
//           return node.token.val
//         case "TOKEN_NULL":
//           return "null"
//         case "TOKEN_BOOL":
//           return node.token.val
//       }
//       break;
//     case "COMPOSITE":
//       switch(node.node.type) {
//         case "NODE_LIST":
//           return compileList(node.node)
//         case "NODE_EXPR":
//           return "(" + compileExpr(node.node) + ")"
//         case "NODE_DICT":
//           return compileDict(node.node)
//         case "NODE_FUNC":
//           return compileFunc(node.node)
//       }
//   }
// }

// function compileCall(node: CallNode): string {
//   return compilePrimary(node.primary) +
//     node.calls.map((call) =>
//       call.type === "NODE_FIELD_CALL"
//         ? compileFieldCall(call)
//         : compileFuncCall(call)
//     ).join("");
// }

// function compileUnary(node: UnaryNode): string {
//   if ("opr" in node) {
//     return node.opr.val + compileUnary(node.next);
//   }
//   return compileCall(node.next);
// }

// function compileFactor(node: FactorNode): string {
//   if ("opr" in node) {
//     return compileUnary(node.left) + " " + node.opr.val + " " +
//       compileFactor(node.right);
//   }
//   return compileUnary(node.left);
// }

// function compileTerm(node: TermNode): string {
//   if ("opr" in node) {
//     return compileFactor(node.left) + " " + node.opr.val + " " +
//       compileTerm(node.right);
//   }
//   return compileFactor(node.left);
// }

// function compileComp(node: CompNode): string {
//   if ("opr" in node) {
//     return compileTerm(node.left) + " " + node.opr.val + " " +
//       compileComp(node.right);
//   }
//   return compileTerm(node.left);
// }

// function compileEq(node: EqNode): string {
//   if ("opr" in node) {
//     return compileComp(node.left) + " " + node.opr.val + " " +
//       compileEq(node.right);
//   }
//   return compileComp(node.left);
// }

// function compileAnd(node: AndNode): string {
//   if (node.right) {
//     return compileEq(node.left) + " && " + compileAnd(node.right);
//   }
//   return compileEq(node.left);
// }

// function compileOr(node: OrNode): string {
//   if (node.right) {
//     return compileAnd(node.left) + " || " + compileOr(node.right);
//   }
//   return compileAnd(node.left);
// }

// function compileExpr(node: ExprNode): string {
//   return compileOr(node.node);
// }

// function compileAssig(node: AssigNode): string {
//   if (node.right) {
//     return compileExpr(node.left) + " = " + compileExpr(node.right);
//   }
//   return compileExpr(node.left);
// }

// function compileDecl(node: DeclNode): string {
//   if ("ids" in node) {
//     if (node.export) {
//       throw createError("destructured values cannot be exported", node.ids[0].loc)
//     }
//     return "let [" + node.ids.map(id => id.val).join(",") + "] = " + compileExpr(node.value);
//   } else {
//     if (node.export) {
//       moduleExports.push(node.id.val)
//     }
//     return "let " + node.id.val + " = " + compileExpr(node.value)
//   }
// }

// function compileIf(node: IfNode): string {
//   return "if (" + compileExpr(node.cond) + "){" +
//     node.stmts.map((stmt) => compileStmt(stmt)).join(";") + "}";
// }

// function compileFor(node: ForNode): string {
//   return "for (let " + node.item.val + " of " + compileExpr(node.source) +
//     "){" + node.stmts.map((stmt) => compileStmt(stmt)).join(";") + "}";
// }

// function compileWhile(node: WhileNode): string {
//   return "while (" + compileExpr(node.cond) + "){" +
//     node.stmts.map((stmt) => compileStmt(stmt)).join(";") + "}";
// }

// function compileBreak(_: BreakNode): string {
//   return "break";
// }

// function compileReturn(node: ReturnNode): string {
//   if ("values" in node) {
//     return "return [" + node.values.map(value => compileExpr(value)).join(",") + "]"
//   } else {
//     return "return " + compileExpr(node.value)
//   }
// }

// function compileModImport(node: ModImportNode): string {
//   const [loc, ...path] = node.path
//   return `const ${node.as.val} = require(${loc.val === "src" ? `process.cwd() + "/" + "${path.map(v => v.val).join("/")}"` : `"${path.map(v => v.val).join("/")}"`})`
// }

// function compileVarImport(node: VarImportNode): string {
//   const [loc, ...path] = node.path
//   return `const {${node.vars.map(v => v.val).join(",")}} = require(${loc.val === "src" ? `process.cwd() + "/" + "${path.map(v => v.val).join("/")}"` : `"${path.map(v => v.val).join("/")}"`})`
// }

// function compileStmt(node: StmtNode): string {
//   switch (node.node.type) {
//     case "NODE_ASSIG":
//       return compileAssig(node.node);
//     case "NODE_DECL":
//       return compileDecl(node.node);
//     case "NODE_IF":
//       return compileIf(node.node);
//     case "NODE_FOR":
//       return compileFor(node.node);
//     case "NODE_WHILE":
//       return compileWhile(node.node);
//     case "NODE_BREAK":
//       return compileBreak(node.node);
//     case "NODE_RETURN":
//       return compileReturn(node.node);
//     case "NODE_MOD_IMPORT":
//       return compileModImport(node.node);
//     case "NODE_VAR_IMPORT":
//       return compileVarImport(node.node);
//   }
// }

// export function compileToCommonJs(node: AstRoot): string {
//   moduleExports = []

//   const intrinsics = `
//     const attempt = function(f) {
//       let result = null;
//       let err = null;

//       try {
//         result = f();
//       } catch (e) {
//         err = { msg: e + "" };
//       }

//       return [result, err];
//     };
//     const fail = function (msg) {
//       throw msg
//     };
//     const print = function (v) {
//       console.log(v);
//     };
//   `.replaceAll("\n", "").replaceAll(/\s{2,}/g, "").trim()

//   const linebreak = ""

//   return [
//     "\"use-strict\";",
//     linebreak,

//     "// Intrinsics",
//     intrinsics,
//     linebreak,

//     "// Compilation",
//     node.stmts.map((stmt) => compileStmt(stmt), { parser: "babel" }).join(";"),
//     linebreak,

//     "// Exports",
//     `module.exports = {${moduleExports.join(",")}}`
//   ].join("\n")
// }
