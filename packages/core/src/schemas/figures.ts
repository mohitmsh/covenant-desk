import { Schema } from "effect"
import { FIGURE_KEYS, SCALES } from "#constants/figures"

/** A figure as claimed by an extractor, before verification against the source document. */
export const FigureClaimSchema = Schema.Struct({
  key: Schema.Literals(FIGURE_KEYS),
  /** Number as printed in the document, e.g. `7940` for "7,940" in a $'000 table. */
  reported: Schema.Finite,
  scale: Schema.Literals(SCALES),
  /** 1-indexed page number. */
  page: Schema.Int.pipe(Schema.check(Schema.isGreaterThanOrEqualTo(1))),
  /** Text from the page containing the row label and the reported number. */
  quote: Schema.String.pipe(Schema.check(Schema.isMinLength(1)))
})
