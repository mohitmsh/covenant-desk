import { Data } from "effect"
import type { RunId } from "#types/ids"
import type { RunStatus } from "#types/runs"

export class NotFound extends Data.TaggedError("NotFound")<{
  readonly entity: string
  readonly id: string
}> {}

export class RunNotReady extends Data.TaggedError("RunNotReady")<{
  readonly runId: RunId
  readonly status: RunStatus
  readonly reason: string
}> {}
