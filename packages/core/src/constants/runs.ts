/** Lifecycle of a monitoring run, in order. */
export const RUN_STATUSES = ["extracting", "tested", "awaiting_signoff", "approved", "failed"] as const

/** Audit event kinds written by the repositories. */
export const AUDIT_EVENT_KINDS = {
  RUN_STARTED: "run.started",
  FIGURE_VERIFIED: "figure.verified",
  FIGURE_REJECTED: "figure.rejected",
  COVENANTS_TESTED: "covenants.tested",
  NOTE_SAVED: "note.saved",
  RUN_APPROVED: "run.approved",
  RUN_FAILED: "run.failed",
  CERTIFICATE_VERIFIED: "certificate.verified",
  CERTIFICATE_REJECTED: "certificate.rejected",
  AGENT_TURN: "agent.turn"
} as const

/** Window in which an unfinished agent run blocks a new one, in minutes. */
export const ACTIVE_RUN_WINDOW_MINUTES = 5
