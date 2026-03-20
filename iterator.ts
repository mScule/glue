import { Nullable } from "./types/nullable.ts";

export type Iterator<T> = {
  cur: () => Nullable<T>;
  peak: (offset: number) => Nullable<T>;
  next: () => void;
};

export function createIterator<T>(from: T[]): Iterator<T> {
  let index = 0;

  function get(index: number): Nullable<T> {
    const isInsideIterable = index > -1 && index < from.length;

    if (!isInsideIterable) {
      return null;
    }

    return from[index];
  }

  return {
    cur: () => get(index),
    peak: (offset: number) => get(index + offset),
    next: () => index++
  };
}
