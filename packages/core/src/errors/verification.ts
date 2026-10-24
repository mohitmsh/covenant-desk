import { Data } from "effect"

export class PageOutOfRange extends Data.TaggedError("PageOutOfRange")<{
  readonly page: number
  readonly pageCount: number
}> {}

export class QuoteTooVague extends Data.TaggedError("QuoteTooVague")<{
  readonly quote: string
}> {}

export class QuoteNotFound extends Data.TaggedError("QuoteNotFound")<{
  readonly page: number
  /** Pages on which the quote does appear. */
  readonly foundOnPages: ReadonlyArray<number>
}> {}

export class ValueNotInQuote extends Data.TaggedError("ValueNotInQuote")<{
  readonly reported: number
  readonly numbersInQuote: ReadonlyArray<number>
}> {}

export type VerificationError = PageOutOfRange | QuoteTooVague | QuoteNotFound | ValueNotInQuote
