import type { ISSUE_ACTIONS, ISSUE_CATEGORIES, ISSUE_KINDS, ISSUE_STATUSES } from "#constants/issues"
import type { VerifiedCertificateClaim } from "#types/certificate"
import type { CovenantResult } from "#types/covenants"
import type { PageBox, PdfText, TableCell } from "#types/pdf"
import type { IsoTimestamp } from "#types/runs"

export type IssueKind = (typeof ISSUE_KINDS)[number]

export type IssueStatus = (typeof ISSUE_STATUSES)[number]

export type IssueAction = (typeof ISSUE_ACTIONS)[number]

export type IssueSeverity = "high" | "medium"

/**
 * What the analyst is being asked: `discrepancy` when two sources disagree,
 * `explanation` when figures are consistent but the movement is unusual, and
 * `verify` when units, period or mapping need a human to confirm.
 */
export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]

/** A value behind an issue, linked to where it was read. */
export interface IssueEvidence {
  readonly label: string
  readonly value: string
  /** Null for values computed rather than read, such as a tested ratio. */
  readonly page: number | null
  readonly box: PageBox | null
}

/** A problem found by a code check, before any analyst decision. */
export interface IssueFinding {
  /** Unique within a run. */
  readonly key: string
  /** Stable across a borrower's packs, so a remembered decision can be reapplied. */
  readonly fingerprint: string
  readonly kind: IssueKind
  readonly category: IssueCategory
  readonly severity: IssueSeverity
  readonly title: string
  readonly detail: string
  readonly page: number
  readonly box: PageBox | null
  readonly evidence: ReadonlyArray<IssueEvidence>
  /** Why it matters, tied to the covenants it affects. */
  readonly impact: string | null
  /** What the analyst could look at to resolve it. */
  readonly checks: ReadonlyArray<string>
}

export interface IssueResolution {
  readonly by: string
  readonly at: IsoTimestamp
  /** Required for an override, optional note otherwise; the remembered reason for an automatic decision. */
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

/** What the post-extraction checks read: the pack, the period tested, and the tested and certified results. */
export interface CheckInput {
  readonly pdf: PdfText
  /** `YYYY-MM` period the run tests. */
  readonly period: string
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
}

/** A row's current and prior amounts, and how far apart they are in words. */
export interface PeriodComparison {
  readonly current: TableCell
  readonly prior: TableCell
  /** `prior month`, `prior quarter` or `prior year`. */
  readonly priorWord: string
}
