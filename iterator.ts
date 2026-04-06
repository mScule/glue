import { Nullable } from "./nullable.ts";

export type Iterator<T> = {
  cur: () => T;
  peak: (offset: number) => T;
  next: () => void;
};

export function createIterator<T>(from: T[], fallback: T): Iterator<T> {
  let index = 0;

  function get(index: number): Nullable<T> {
    const isInsideIterable = index > -1 && index < from.length;

    if (!isInsideIterable) {
      return null;
    }

    return from[index];
  }

  return {
    cur: () => get(index) ?? fallback,
    peak: (offset: number) => get(index + offset) ?? fallback,
    next: () => index++
  };
}
