import { AUDIT_EVENT_KINDS, FIGURE_LABELS, METRICS } from "@covenant-desk/core/constants"
import { IN_PROGRESS_RUN_STATUSES, METRIC_LABELS } from "@/constants"
import type { AuditEvent, JsonValue, Metric, RunStatus } from "@/types"
import { isFigureKey } from "./figures"
import { formatPage } from "./format"

export const isRunInProgress = (status: RunStatus): boolean => IN_PROGRESS_RUN_STATUSES.some((s) => s === status)

export interface AgentStep {
  readonly id: number
  readonly label: string
  readonly detail: string | null
  readonly tone: "neutral" | "positive" | "negative"
}

type JsonObject = { readonly [key: string]: JsonValue }

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isMetric = (value: JsonValue | undefined): value is Metric =>
  typeof value === "string" && METRICS.some((metric) => metric === value)

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
export interface AgentUsage {
  readonly costUsd: number
  readonly toolCalls: number
  /** Time spent waiting on the model, summed over turns. */
  readonly modelSeconds: number
  /** When the run is a replay of a recorded agent run, when it was recorded. */
  readonly recordedAt: string | null
}

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

export const formatUsd = (value: number): string => `$${value.toFixed(4)}`
