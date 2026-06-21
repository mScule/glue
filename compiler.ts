import { Node } from "./parser.ts";

export type Compiler<T> = (ast: Node) => T;
