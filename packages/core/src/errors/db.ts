import { Data } from "effect"

export class DbError extends Data.TaggedError("DbError")<{
  readonly sql: string
  readonly cause: Error
}> {}
