import { Data } from "effect"

export class InvalidDecision extends Data.TaggedError("InvalidDecision")<{
  readonly reason: string
}> {}
