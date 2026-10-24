import type { CovenantStatus, Metric, Operator, RunStatus } from "@/types"

export const RUN_STATUS_LABELS = {
  extracting: "Extracting",
  tested: "Tested",
  awaiting_signoff: "Awaiting sign-off",
  approved: "Approved",
  failed: "Failed"
} as const satisfies Record<RunStatus, string>

export const COVENANT_STATUS_LABELS = {
  pass: "Pass",
  watch: "Watch",
  breach: "Breach"
} as const satisfies Record<CovenantStatus, string>

export const OPERATOR_SYMBOLS = {
  lte: "≤",
  gte: "≥"
} as const satisfies Record<Operator, string>

export const AUDIT_EVENT_LABELS: Readonly<Record<string, string>> = {
  "run.started": "Run started",
  "figure.verified": "Figure verified to source",
  "figure.rejected": "Figure rejected",
  "covenants.tested": "Covenants tested",
  "note.saved": "Monitoring note saved",
  "run.approved": "Run approved",
  "run.failed": "Run failed",
  "certificate.verified": "Certificate figure verified",
  "certificate.rejected": "Certificate figure rejected",
  "agent.turn": "Agent step"
}

export const METRIC_LABELS = {
  net_leverage: "Net leverage",
  interest_cover: "Interest cover",
  minimum_liquidity: "Minimum liquidity"
} as const satisfies Record<Metric, string>
