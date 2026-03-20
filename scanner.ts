import { createIterator, Iterator } from "./iterator.ts";
import { Location } from "./location.ts";

export type Scanner = Iterator<string> & {
  loc: () => Location;
};

export function scan(from: string): Scanner {
  const loc: Location = { ln: 1, col: 1 };
  const iterator = createIterator(from as unknown as string[]);

  return {
    ...iterator,
    next: () => {
      if (iterator.cur() === "\n") {
        loc.col = 1;
        loc.ln++;
      } else {
        loc.col++;
      }
      iterator.next();
    },
    loc: () => ({ ln: loc.ln, col: loc.col }),
  };
}
