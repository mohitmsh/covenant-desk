import { Effect } from "effect"

/** Returns the first row of a statement that must return one, such as `insert … returning`. */
export const firstRow = <T>(rows: ReadonlyArray<T>, statement: string) =>
  rows[0] === undefined ? Effect.die(new Error(`${statement} returned no rows`)) : Effect.succeed(rows[0])
