import { Data } from "effect"

export class BudgetExceeded extends Data.TaggedError("BudgetExceeded")<{
  readonly spentUsd: number
  readonly budgetUsd: number
}> {}

export class AgentStopped extends Data.TaggedError("AgentStopped")<{
  readonly reason: string
}> {}

export class ModelRequestFailed extends Data.TaggedError("ModelRequestFailed")<{
  readonly status: number | null
  readonly cause: Error
}> {}
