import { AUDIT_EVENT_KINDS, FIGURE_LABELS } from "@covenant-desk/core/constants"
import { IN_PROGRESS_RUN_STATUSES, METRIC_LABELS } from "@/constants"
import type {
  AgentStep,
  AgentUsage,
  AuditEvent,
  JsonObject,
  JsonValue,
  RunDetail,
  RunGroups,
  RunStatus,
  RunSummary
} from "@/types"
import { formatPage } from "./format"
import { isFigureKey, isMetric } from "./guards"

export const isRunInProgress = (status: RunStatus): boolean => IN_PROGRESS_RUN_STATUSES.some((s) => s === status)

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const metricLabel = (metric: JsonValue | undefined) => (isMetric(metric) ? METRIC_LABELS[metric] : "Covenant")

const figureLabel = (key: string | null) => (key && isFigureKey(key) ? FIGURE_LABELS[key] : (key ?? "Figure"))

/** Progress steps shown while the agent works, derived from the run's audit events. */
export const agentSteps = (events: ReadonlyArray<AuditEvent>): AgentStep[] =>
  events.flatMap((event): AgentStep[] => {
    const { detail } = event
    const key = typeof detail.key === "string" ? detail.key : null
    switch (event.kind) {
      case AUDIT_EVENT_KINDS.RUN_STARTED:
        return [{ id: event.id, label: "Reading the reporting pack", detail: null, tone: "neutral" }]
      case AUDIT_EVENT_KINDS.FIGURE_VERIFIED:
        return [
          {
            id: event.id,
            label: `${figureLabel(key)} verified`,
            detail: typeof detail.page === "number" ? formatPage(detail.page) : null,
            tone: "positive"
          }
        ]
      case AUDIT_EVENT_KINDS.FIGURE_REJECTED: {
        const claim = detail.claim
        const claimKey = isJsonObject(claim) && typeof claim.key === "string" ? claim.key : null
        return [{ id: event.id, label: `${figureLabel(claimKey)} rejected, retrying`, detail: null, tone: "negative" }]
      }
      case AUDIT_EVENT_KINDS.CERTIFICATE_VERIFIED:
        return [
          {
            id: event.id,
            label: `Certificate ${metricLabel(detail.metric).toLowerCase()} verified`,
            detail: typeof detail.page === "number" ? formatPage(detail.page) : null,
            tone: "positive"
          }
        ]
      case AUDIT_EVENT_KINDS.CERTIFICATE_REJECTED:
        return [{ id: event.id, label: "Certificate figure rejected, retrying", detail: null, tone: "negative" }]
      case AUDIT_EVENT_KINDS.COVENANTS_TESTED:
        return [{ id: event.id, label: "Covenants tested", detail: null, tone: "positive" }]
      case AUDIT_EVENT_KINDS.NOTE_SAVED:
        return [{ id: event.id, label: "Monitoring note drafted", detail: null, tone: "positive" }]
      case AUDIT_EVENT_KINDS.RUN_FAILED:
        return [
          {
            id: event.id,
            label: "Run failed",
            detail: typeof detail.reason === "string" ? detail.reason : null,
            tone: "negative"
          }
        ]
      default:
        return []
    }
  })

/** Model spend recorded on the run's latest agent turn, in US dollars. */
const numberOr = (value: JsonValue | undefined, fallback: number) => (typeof value === "number" ? value : fallback)

/** Cost, tool calls and model time for an agent run, from its turn events; null for runs without an agent. */
export const agentUsage = (events: ReadonlyArray<AuditEvent>): AgentUsage | null => {
  const turns = events.filter((event) => event.kind === AUDIT_EVENT_KINDS.AGENT_TURN)
  const last = turns.at(-1)
  if (last === undefined) return null
  const replay = events.find((event) => event.kind === AUDIT_EVENT_KINDS.AGENT_REPLAYED)?.detail.recordedAt
  return {
    costUsd: numberOr(last.detail.costUsd, 0),
    toolCalls: turns.reduce((sum, turn) => sum + numberOr(turn.detail.toolCalls, 0), 0),
    modelSeconds: turns.reduce((sum, turn) => sum + numberOr(turn.detail.latencyMs, 0), 0) / 1000,
    recordedAt: typeof replay === "string" ? replay : null
  }
}

/**
 * Splits runs, newest first, into those awaiting a decision, those approved,
 * and older runs for a borrower and period that a later run replaced.
 */
export const groupRuns = (runs: ReadonlyArray<RunSummary>): RunGroups<RunSummary> => {
  const seen = new Set<string>()
  const replaced = new Set<string>()
  for (const run of runs) {
    if (run.status === "failed") continue
    const slot = `${run.borrowerId}/${run.period}`
    if (seen.has(slot)) replaced.add(run.id)
    seen.add(slot)
  }
  const current = runs.filter((run) => !replaced.has(run.id))
  return {
    pending: current.filter((run) => run.status !== "approved"),
    approved: current.filter((run) => run.status === "approved"),
    superseded: runs.filter((run) => replaced.has(run.id))
  }
}

/** Whether the run's breach rests on certificate add-backs the analyst has not yet decided on. */
export const isAwaitingAddBackDecision = ({ ebitdaGap, covenants, issues }: RunDetail): boolean =>
  ebitdaGap !== null &&
  covenants.some((c) => c.status === "breach" && ebitdaGap.metrics.includes(c.metric)) &&
  issues.some((issue) => issue.kind === "certificate_mismatch" && issue.status === "open")
