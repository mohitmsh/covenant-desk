import type { CovenantStatus, IssueKind, IssueStatus, Metric, Operator, RunStatus } from "@/types"

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
  "agent.turn": "Agent step",
  "checks.completed": "Review checks run",
  "issue.decided": "Issue decided",
  "issue.remembered": "Issue decided from memory",
  "issue.reopened": "Issue reopened"
}

export const ISSUE_KIND_LABELS = {
  certificate_mismatch: "Certificate mismatch",
  subtotal: "Subtotal error",
  variance: "Large change"
} as const satisfies Record<IssueKind, string>

export const ISSUE_STATUS_LABELS = {
  open: "To review",
  accepted: "Accepted",
  overridden: "Overridden",
  queried: "Query drafted"
} as const satisfies Record<IssueStatus, string>

export const METRIC_LABELS = {
  net_leverage: "Net leverage",
  interest_cover: "Interest cover",
  minimum_liquidity: "Minimum liquidity"
} as const satisfies Record<Metric, string>
