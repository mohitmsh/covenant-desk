import type { ISSUE_ACTIONS, ISSUE_KINDS, ISSUE_STATUSES } from "#constants/issues"
import type { PageBox } from "#types/pdf"
import type { IsoTimestamp } from "#types/runs"

export type IssueKind = (typeof ISSUE_KINDS)[number]

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export type IssueAction = (typeof ISSUE_ACTIONS)[number]

export type IssueSeverity = "high" | "medium"

/** A problem found by a code check, before any analyst decision. */
export interface IssueFinding {
  /** Unique within a run. */
  readonly key: string
  /** Stable across a borrower's packs, so a remembered decision can be reapplied. */
  readonly fingerprint: string
  readonly kind: IssueKind
  readonly severity: IssueSeverity
  readonly title: string
  readonly detail: string
  readonly page: number
  readonly box: PageBox | null
}

export interface IssueResolution {
  readonly by: string
  readonly at: IsoTimestamp
  /** Required for an override; the remembered reason for an automatic decision. */
  readonly reason: string | null
  /** Draft query to the borrower, held until approved. */
  readonly draft: string | null
  /** Applied automatically from an earlier decision for this borrower. */
  readonly remembered: boolean
}

export interface Issue extends IssueFinding {
  readonly status: IssueStatus
  readonly resolution: IssueResolution | null
}

export interface IssueDecision {
  readonly action: IssueAction
  readonly actor: string
  readonly reason?: string | undefined
  readonly draft?: string | undefined
  readonly remember?: boolean | undefined
}
