import { Location } from "./location.ts";
import { FuncCall, FuncLitNode, MemberNode, ModuleNode, Node, PipeLitNode } from "./parser.ts";

export type Vars = Record<string, Value>

export type Context = {
  parent: Context | null;
  vars: Vars
};

export type NullValue = { type: "VALUE_NULL" };
export type BoolValue = { type: "VALUE_BOOL"; value: boolean };
export type NumberValue = { type: "VALUE_NUMBER"; value: number };
export type StringValue = { type: "VALUE_STRING"; value: string };

export type ListValue = { type: "VALUE_LIST"; value: Value[] };
export type DictValue = { type: "VALUE_DICT"; value: Vars };
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
  quote: ModuleNode;
  value: Context;
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

export type ListRef = { type: "REF_LIST", origin: ListValue, index: number }
export type DictRef = { type: "REF_DICT", origin: DictValue, key: string }
export type VarRef = { type: "REF_VAR", origin: Context, key: string }
export type IntrinsicRef = { type: "REF_INTRINSIC", key: string }

export type RefResult = { type: "RESULT_REF"; payload: ListRef | DictRef | VarRef }
export type ValueResult = { type: "RESULT_VALUE"; payload: Value };
export type ReturnResult = { type: "RESULT_RETURN"; payload: Value };
export type BreakResult = { type: "RESULT_BREAK" };
export type PanicResult = { type: "RESULT_PANIC", message: string, loc: Location }

export type Result =
  | RefResult
  | ValueResult
  | ReturnResult
  | BreakResult
  | PanicResult;

// Utilities

function jsToValue(value: object): Value {
  switch(typeof value) {
    case "string":
      return { type: "VALUE_STRING", value }
    case "number":
      return { type: "VALUE_NUMBER", value }
    case "bigint":
      return { type: "VALUE_NUMBER", value }
    case "boolean":
      return { type: "VALUE_BOOL", value }
    case "symbol":
      throw "Symbols are not supported"
    case "undefined":
      return { type: "VALUE_NULL" }
    case "object": {
      if (Array.isArray(value)) {
        const arr = value as object[]
        return { type: "VALUE_LIST", value: arr.map(v => jsToValue(v) )}
      } else {
        const dict: Record<string, Value> = {}
        for (const [k, v] of Object.entries(value)) {
          dict[k] = jsToValue(v)
        }
        return { type: "VALUE_DICT", value: dict }
      }
    }
    case "function":
      throw "Functions are not supported"
  }
}

function requireValue(result: Result): Value {
  switch(result.type) {
    case "RESULT_REF":
    case "RESULT_VALUE":
    default:
      
  }
  if (result.type === "RESULT_REF") {
    return resolveRef(result)
  }

  if (result.type !== "RESULT_VALUE") {
    throw "Interpreter: was waiting for a value but got " + result.type;
  }
  return result.payload;
}

function requireFuncCall(node: MemberNode): FuncCall {
  const call = node.members[0]

  if (!call || call.type !== "INTERNAL_FUNC_CALL") {
    throw "Interpreter: Expected func call"
  }

  return call
}

function requireRef(result: Result): RefResult {
  if (result.type !== "RESULT_REF") {
    throw "Interpreter: was waiting for a ref but got " + result.type;
  }
  return result
}

function resolveRef(ref: RefResult): Value {
  switch(ref.payload.type) {
    case "REF_LIST":
      return ref.payload.origin.value[ref.payload.index]
    case "REF_DICT":
      return ref.payload.origin.value[ref.payload.key]
    case "REF_VAR":
      return ref.payload.origin.vars[ref.payload.key]
  }
}

function createListRef(origin: ListValue, index: number): RefResult {
  return { type: "RESULT_REF", payload: {
    type: "REF_LIST",
    origin, index
  } }
}

function createDictRef(origin: DictValue, key: string): RefResult {
  return { type: "RESULT_REF", payload: {
    type: "REF_DICT",
    origin, key
  } }
}

function createVarRef(origin: Context, key: string): RefResult {
  return { type: "RESULT_REF", payload: {
    type: "REF_VAR",
    origin, key
  }}
}

function createNullValueResult(): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_NULL" }}
}

function createBoolValueResult(value: boolean): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_BOOL", value }}
}

function createNumberValueResult(value: number): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_NUMBER", value }}
}

function createStringValueResult(value: string): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_STRING", value }}
}

function createListValueResult(value: Value[]): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_LIST", value }}
}

function createDictValueResult(value: Vars): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_DICT", value }}
}

function createFuncValueResult(value: FuncLitNode, parent: Context | null = null): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_FUNC", value, closure: createContext(parent) }}
}

function createPipeValueResult(value: PipeLitNode, parent: Context | null = null): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_PIPE", value, closure: createContext(parent) }}
}

function createModuleValueResult(value: Context, quote: ModuleNode): ValueResult {
  return { type: "RESULT_VALUE", payload: { type: "VALUE_MODULE", value, quote }}
}

function createReturnResult(value: Value): ReturnResult {
  return { type: "RESULT_RETURN", payload: value };
}

function createBreakResult(): BreakResult {
  return { type: "RESULT_BREAK" };
}

export function createContext(parent: Context | null = null): Context {
  return { parent, vars: {} };
}

function formatValue(value: Value, specify = false, depth = 0): string {
  switch (value.type) {
    case "VALUE_NULL":
      return "null";
    case "VALUE_BOOL":
      return value.value + "";
    case "VALUE_NUMBER":
      return value.value + "";
    case "VALUE_STRING":
      if (specify) {
        return "\"" + value.value + "\""
      }
      return value.value;
    case "VALUE_LIST":
      return [
        `list {\n`,
        `${value.value.map((v) => " ".repeat((depth + 1) * 4) + formatValue(v, true, depth + 1)).join("\n")}\n`,
        " ".repeat(depth * 4) + "}"
      ].join("");
    case "VALUE_DICT":
      return [
        `dict {\n`,
        `${Object.entries(value.value).map(([key, value]) => " ".repeat((depth + 1) * 4) + `${key} = ${formatValue(value, true, depth + 1)}`).join("\n")}\n`,
        " ".repeat(depth * 4) + "}"
      ].join("");
    case "VALUE_FUNC":
      return `func (${value.value.params.map((p) => p.val).join(" ")}) {...}`;
    case "VALUE_PIPE":
      return `pipe ${value.value.target.val} {...}`;
    case "VALUE_MODULE":
      return `module {...}`;
  }
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
  switch(expr.type) {
    case "VALUE_NULL":
    case "VALUE_BOOL":
    case "VALUE_NUMBER":
    case "VALUE_STRING":
    case "VALUE_LIST":
    case "VALUE_DICT":
      throw "Only func pipe or modules can be quoted"
    case "VALUE_FUNC":
      return jsToValue(expr.value)
    case "VALUE_PIPE":
      return jsToValue(expr.value)
    case "VALUE_MODULE":
      return jsToValue(expr.quote)
  }
}

function intrinsicPrint(message: Value) {
  console.log(formatValue(message));
}

function intrinsicPanic(message: Value) {
  throw `PANIC: ${formatValue(message)}`;
}

export function evaluate(node: Node, ctx: Context = createContext()): Result {
  switch(node.type) {
    case "NODE_LIT_PRIM": return (() => {
      switch (node.val.type) {
        case "TOKEN_ID":
          return createVarRef(ctx, node.val.val)
        case "TOKEN_NULL":
          return createNullValueResult()
        case "TOKEN_BOOL":
          return createBoolValueResult(node.val.val === "true")
        case "TOKEN_NUMBER":
          return createNumberValueResult(Number(node.val.val))
        case "TOKEN_STRING":
          return createStringValueResult(node.val.val)
      }
    })()
    case "NODE_LIT_FUNC": {
      return createFuncValueResult(node, ctx)
    }
    case "NODE_LIT_PIPE": {
      return createPipeValueResult(node, ctx)
    }
    case "NODE_LIT_LIST": {
      return createListValueResult(node.vals.map(v => requireValue(evaluate(v, ctx))))
    }
    case "NODE_LIT_DICT": {
      const value: Record<string, Value> = {}

      for (const { key, val } of node.vals) {
        value[key.val] = requireValue(evaluate(val, ctx))
      }

      return createDictValueResult(value)
    }
    case "NODE_MEMBER": {
      let result = requireRef(evaluate(node.origin, ctx))

      // Intrinsic functions

      if (result.payload.type === "REF_VAR") {
        
        switch(result.payload.key) {
          case "dir":
          case "read":
          case "write":
            throw "Not supported"
          case "quote": {
            const params = requireFuncCall(node)
            return { type: "RESULT_VALUE", payload: intrinsicQuote(requireValue(evaluate(params.args[0], ctx))) }
          }
          case "print": {
            const params = requireFuncCall(node)
            intrinsicPrint(requireValue(evaluate(params.args[0], ctx)))
            return createNullValueResult()
          }
          case "panic":
            throw "Not supported"
        }
      }

      // Members

      for (const member of node.members) {
        switch(member.type) {
          case "INTERNAL_FUNC_CALL":
            throw "Func calls not supported yet"
          case "INTERNAL_FIELD_CALL": {
            const field = requireValue(evaluate(member.arg, ctx))

            switch (field.type) {
              case "VALUE_NUMBER": {
                const origin = resolveRef(result)
                if (origin.type !== "VALUE_LIST") {
                  throw "Expected List but got " + origin.type
                }
                result = createListRef(origin, field.value)
                break
              }
              case "VALUE_STRING": {
                const origin = resolveRef(result)
                if (origin.type !== "VALUE_DICT") {
                  throw "Expect Dict but got " + origin.type
                }
                result = createDictRef(origin, field.value)
                break
              }
              case "VALUE_NULL":
              case "VALUE_BOOL":
              case "VALUE_LIST":
              case "VALUE_DICT":
              case "VALUE_FUNC":
              case "VALUE_PIPE":
              case "VALUE_MODULE":
                throw "Value of type " + formatValue(field) + " cannot be used as member accessor"
            }
          }
        }
      }

      return result
    }
    case "NODE_PIPE":
    case "NODE_UNARY":
    case "NODE_BINARY":
    case "NODE_IF":
    case "NODE_WHILE":
    case "NODE_FOR":
    case "NODE_RETURN_SINGLE":
    case "NODE_RETURN_MULTI":
    case "NODE_BREAK":
    case "NODE_SCOPED_EXPR":
      throw "Not supported"
    case "NODE_ASSIG": {
      const ref = requireRef(evaluate(node.target, ctx))
      const value = requireValue(evaluate(node.val, ctx))
      switch (ref.payload.type) {
        case "REF_LIST": {
          ref.payload.origin.value[ref.payload.index] = value
          break
        }
        case "REF_DICT": {
          ref.payload.origin.value[ref.payload.key] = value
          break
        }
        case "REF_VAR": {
          ref.payload.origin.vars[ref.payload.key] = value
          break
        }
      }
      break
    }
    case "NODE_DECL_VAR_SINGLE": {
      ctx.vars[node.id.val] = requireValue(evaluate(node.val, ctx))
      break
    }
    case "NODE_DECL_VAR_MULTI":
      throw "Not supported"
    case "NODE_IMPORT_MOD":
    case "NODE_IMPORT_VARS":
      throw "Not supported"
    case "NODE_MODULE": {
      const ctx = createContext()

      for (const stmt of node.stmts) {
        evaluate(stmt, ctx)
      }

      return createModuleValueResult(ctx, node)
    }
  }

  return createNullValueResult()
}
