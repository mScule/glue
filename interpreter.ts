import { FuncLitNode, Node, PipeLitNode } from "./parser.ts";

export type NullValue = { type: "VALUE_NULL" };
export type BoolValue = { type: "VALUE_BOOL"; value: boolean };
export type NumberValue = { type: "VALUE_NUMBER"; value: number };
export type StringValue = { type: "VALUE_STRING"; value: string };

export type ListValue = { type: "VALUE_LIST"; value: Value[] };
export type DictValue = { type: "VALUE_DICT"; value: Record<string, Value> };
export type FuncValue = {
  type: "VALUE_FUNC";
  value: FuncLitNode;
  closure: Context;
};
export type PipeValue = {
  type: "VALUE_PIPE";
  value: PipeLitNode;
  closure: Context;
};

export type ModuleValue = {
  type: "VALUE_MODULE";
  value: Record<string, Value>;
};

export type Value =
  | NullValue
  | BoolValue
  | NumberValue
  | StringValue
  | ListValue
  | DictValue
  | FuncValue
  | PipeValue
  | ModuleValue;

export type ValueResult = { type: "RESULT_VALUE", payload: Value }
export type ReturnResult = { type: "RESULT_RETURN", payload: Value }
export type BreakResult = { type: "RESULT_BREAK" }

export type EvalResult =
  | ValueResult
  | ReturnResult
  | BreakResult

export type Context = {
  parent: Context | null;
  vars: Record<string, Value>;
};

export type Interpreter = {
  ctx: Context;
  modules: Record<string, Value>;
};

// Utilities

function requireValue(result: EvalResult): Value {
  if (result.type !== "RESULT_VALUE") {
    throw "Interpreter: was waiting for a value but got " + result.type
  }
  return result.payload
}

function createValueResult(value: Value): ValueResult {
  return { type: "RESULT_VALUE", payload: value }
}

function createReturnResult(value: Value): ReturnResult {
  return { type: "RESULT_RETURN", payload: value }
}

function createBreakResult(): BreakResult {
  return { type: "RESULT_BREAK" }
}

function createContext(parent: Context | null = null): Context {
  return { parent, vars: {} };
}

function formatValue(value: Value): string {
  switch (value.type) {
    case "VALUE_NULL":
      return "null";
    case "VALUE_BOOL":
      return value.value + "";
    case "VALUE_NUMBER":
      return value.value + "";
    case "VALUE_STRING":
      return value.value;
    case "VALUE_LIST":
      return `list {${value.value.map((v) => formatValue(v)).join(" ")}}`;
    case "VALUE_DICT":
      return `dict {${
        Object.entries(value.value).map(([key, value]) => `${key} = ${value}`)
          .join(" ")
      }}`;
    case "VALUE_FUNC":
      return `func (${value.value.params.map((p) => p.val).join(" ")}) {...}`;
    case "VALUE_PIPE":
      return `pipe ${value.value.target.val} {...}`;
    case "VALUE_MODULE":
      return `module {...}`;
  }
}

function getVarValue(ctx: Context, name: string): Value {
  if (name in ctx.vars) {
    return ctx.vars[name];
  }

  if (ctx.parent) {
    return getVarValue(ctx.parent, name);
  }

  throw `Interpreter: Value ${name} is not defined`;
}

function setVarValue(ctx: Context, name: string, value: Value) {
  if (name in ctx.vars) {
    ctx.vars[name] = value;
  }

  if (ctx.parent) {
    return setVarValue(ctx.parent, name, value);
  }

  throw `Interpreter: Value ${name} is not defined`;
}

// Intrinsic functions

function intrinsicDir(path: Value): Value {
  throw `Interpreter: Dir is not supported yet`;
}

function intrinsicRead(path: Value): Value {
  throw `Interpreter: Read is not supported yet`;
}

function intrinsicWrite(path: Value, content: Value): Value {
  throw `Interpreter: Write is not supported yet`;
}

function intrinsicQuote(expr: Value): Value {
  throw `Interpreter: Quote is not supported yet`;
}

function intrinsicLog(message: Value) {
  console.log(formatValue(message));
}

function intrinsicPanic(message: Value) {
  throw `Interpreter: Panic ${formatValue(message)}`;
}

// Evaluation

function eval(ctx: Context, node: Node): EvalResult {
  switch (node.type) {
    case "NODE_LIT_PRIM":
      return (() => {
        switch (node.val.type) {
          case "TOKEN_ID":
            return createValueResult(getVarValue(ctx, node.val.val));
          case "TOKEN_NULL":
            return createValueResult({ type: "VALUE_NULL" });
          case "TOKEN_BOOL":
            return createValueResult({ type: "VALUE_BOOL", value: node.val.val === "true" });
          case "TOKEN_NUMBER":
            return createValueResult({ type: "VALUE_NUMBER", value: Number(node.val.val) });
          case "TOKEN_STRING":
            return createValueResult({ type: "VALUE_STRING", value: node.val.val });
        }
      })();
    case "NODE_LIT_LIST":
      return createValueResult({ type: "VALUE_LIST", value: node.vals.map((v) => requireValue(eval(ctx, v))) });
    case "NODE_LIT_DICT":
      return createValueResult({
        type: "VALUE_DICT",
        value: (() => {
          const dict: Record<string, Value> = {};
          for (const { key: { val: key }, val } of node.vals) {
            dict[key] = requireValue(eval(ctx, val));
          }
          return dict;
        })(),
      });
    case "NODE_LIT_FUNC":
      return createValueResult({ type: "VALUE_FUNC", value: node, closure: createContext(ctx) });
    case "NODE_LIT_PIPE":
      return createValueResult({ type: "VALUE_PIPE", value: node, closure: createContext(ctx) });
    case "NODE_MEMBER": return (() => {
      let result = requireValue(eval(ctx, node.origin))

      for (const member of node.members) {
        switch(member.type) {
          case "INTERNAL_FUNC_CALL": {
            if (result.type !== "VALUE_FUNC") {
              throw `Cannot call ${formatValue(result)} as it's not a function`
            }

            const func = result.value
            const closure = result.closure

            // Read in parameters

            let i = 0;
            for (const param of func.params) {
              closure.vars[param.val] = member.args[i]
                ? requireValue(eval(ctx, member.args[i]))
                : { type: "VALUE_NULL" }
              i++;
            }

            // Execute code

            for (const stmt of func.stmts) {
              const funcResult = eval(closure, stmt)
              switch (funcResult.type) {
                case "RESULT_VALUE":
                  continue;
                case "RESULT_RETURN":
                result = requireValue(funcResult)
                  break;
                case "RESULT_BREAK":
                  throw "Break cannot be called in a function body";
              }
            }
            
            break;
          }
          case "INTERNAL_FIELD_CALL":
            result = requireValue(eval(ctx, member.arg))
        }
      }

      return createValueResult(result)
    })()
    case "NODE_PIPE":
    case "NODE_UNARY":
    case "NODE_BINARY":
    case "NODE_IF":
    case "NODE_WHILE":
    case "NODE_FOR":
    case "NODE_RETURN_SINGLE":
    case "NODE_RETURN_MULTI":
      throw "Interpreter: return cannot be used outside "
    case "NODE_BREAK":
    case "NODE_SCOPED_EXPR":
    case "NODE_ASSIG":
    case "NODE_DECL_VAR_SINGLE":
    case "NODE_DECL_VAR_MULTI":
    case "NODE_IMPORT_MOD":
    case "NODE_IMPORT_VARS":
      throw "Interpreter: Importing is not yet supported";
    case "NODE_MODULE":
  }
}
