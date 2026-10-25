import { formatUsd } from "@covenant-desk/core/format"

interface TaggedFailure {
  readonly _tag: string
  readonly reason?: string
  readonly spentUsd?: number
  readonly budgetUsd?: number
  readonly status?: number | null
}

/** One-line explanation of why an agent run stopped, for the audit log and the UI. */
export const describeAgentFailure = (error: TaggedFailure): string => {
  switch (error._tag) {
    case "BudgetExceeded":
      return `Stopped at ${formatUsd(error.spentUsd ?? 0)}, over the ${formatUsd(error.budgetUsd ?? 0)} run budget`
    case "AgentStopped":
      return error.reason ?? "The agent stopped"
    case "ModelRequestFailed":
      return error.status === 401
        ? "The Anthropic API key was rejected"
        : `The model request failed${error.status ? ` (HTTP ${error.status})` : ""}`
    default:
      return `Run failed: ${error._tag}`
  }
}
