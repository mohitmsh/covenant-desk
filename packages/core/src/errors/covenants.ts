import { Data } from "effect"
import type { FigureKey } from "#types/figures"

export class MissingFigures extends Data.TaggedError("MissingFigures")<{
  readonly covenantId: string
  readonly missing: ReadonlyArray<FigureKey>
}> {}

export class NotMeaningful extends Data.TaggedError("NotMeaningful")<{
  readonly covenantId: string
  readonly reason: string
}> {}
