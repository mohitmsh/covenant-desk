import type {
  CovenantStatus,
  DisagreementLevel,
  EvalCaseResult,
  EvalCheck,
  IssueCategory,
  IssueKind,
  IssueStatus,
  Metric,
  Operator,
  PillTone,
  RunStatus
} from "@/types"

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
  "agent.replayed": "Recorded agent run replayed",
  "checks.completed": "Review checks run",
  "issue.decided": "Issue decided",
  "issue.remembered": "Issue decided from memory",
  "issue.reopened": "Issue reopened"
}

export const ISSUE_KIND_LABELS = {
  certificate_mismatch: "Certificate mismatch",
  subtotal: "Subtotal error",
  variance: "Large change",
  period: "Wrong period",
  conflict: "Pages disagree"
} as const satisfies Record<IssueKind, string>

export const ISSUE_CATEGORY_LABELS = {
  discrepancy: "Discrepancy",
  explanation: "Needs explanation",
  verify: "Verify"
} as const satisfies Record<IssueCategory, string>

export const ISSUE_STATUS_LABELS = {
  open: "To review",
  accepted: "Accepted",
  overridden: "Overridden",
  queried: "Query drafted",
  extraction_error: "Extraction error"
} as const satisfies Record<IssueStatus, string>

export const METRIC_LABELS = {
  net_leverage: "Net leverage",
  interest_cover: "Interest cover",
  minimum_liquidity: "Minimum liquidity"
} as const satisfies Record<Metric, string>

/** Column headings for covenants where space is short. */
export const METRIC_SHORT_LABELS = {
  net_leverage: "Net leverage",
  interest_cover: "Interest cover",
  minimum_liquidity: "Liquidity"
} as const satisfies Record<Metric, string>

export const RUN_STATUS_PILL_TONES = {
  extracting: "neutral",
  tested: "neutral",
  awaiting_signoff: "accent",
  approved: "positive",
  failed: "negative"
} as const satisfies Record<RunStatus, PillTone>

export const COMPLIANCE_WORDS = { true: "complies", false: "does not comply" } as const

/** What the certificate's figure means against the tested result. */
export const CERTIFICATE_RESULT_LABELS = {
  compliance: "Different outcome",
  value: "Same outcome, different figure",
  none: "Agrees"
} as const satisfies Record<DisagreementLevel, string>

export const CERTIFICATE_VERDICTS = {
  compliance: "Certificate disagrees",
  value: "Certificate figure differs",
  none: "Certificate agrees"
} as const satisfies Record<DisagreementLevel, string>

/** ✕ the certificate reaches a different outcome, ≠ a different figure, ✓ it agrees. */
export const CERTIFICATE_MARKS = { compliance: "✕", value: "≠", none: "✓" } as const satisfies Record<
  DisagreementLevel,
  string
>

export const EVAL_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  normal: "Normal",
  unseen: "Unseen pack",
  units: "Units trap",
  period: "Wrong period",
  conflict: "Conflicting pages",
  injection: "Prompt injection"
}

export const EVAL_CHECK_GROUP_LABELS = {
  run: "Run",
  figures: "Figures",
  covenants: "Covenants",
  issues: "Review checks",
  certificate: "Certificate",
  note: "Note",
  grounding: "Grounding"
} as const satisfies Record<EvalCheck["group"], string>

export const EVAL_MODE_LABELS = {
  live: "Live",
  replay: "Replayed",
  "not-recorded": "Not recorded"
} as const satisfies Record<EvalCaseResult["mode"], string>
