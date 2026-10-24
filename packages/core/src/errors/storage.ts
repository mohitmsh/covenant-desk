import { Data } from "effect"

export class DocumentStoreError extends Data.TaggedError("DocumentStoreError")<{
  readonly key: string
  readonly cause: Error
}> {}
