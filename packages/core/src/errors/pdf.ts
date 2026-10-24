import { Data } from "effect"

export class PdfUnreadable extends Data.TaggedError("PdfUnreadable")<{
  readonly cause: Error
}> {}
