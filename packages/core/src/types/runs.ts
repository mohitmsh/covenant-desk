import type { RUN_STATUSES } from "#constants/runs"
import type { CertificateComparison, EbitdaGap, VerifiedCertificateClaim } from "#types/certificate"
import type { CovenantResult } from "#types/covenants"
import type { JsonValue } from "#types/db"
import type { VerifiedFigure } from "#types/figures"
import type { BorrowerId, DocumentId, RunId } from "#types/ids"
import type { Issue } from "#types/issues"

export type RunStatus = (typeof RUN_STATUSES)[number]

/** ISO 8601 timestamp in UTC. */
export type IsoTimestamp = string

export interface Borrower {
  readonly id: BorrowerId
  readonly name: string
  readonly facilityName: string
  readonly facilityLimit: number
  readonly analyst: string
}

export interface NewDocument {
  readonly borrowerId: BorrowerId
  /** Reporting period, `YYYY-MM`. */
  readonly period: string
  readonly filename: string
  readonly sha256: string
  readonly storageKey: string
  readonly pageCount: number
}

export interface DocumentRecord {
  readonly id: DocumentId
  readonly filename: string
  readonly sha256: string
  readonly storageKey: string
  readonly pageCount: number
  readonly receivedAt: IsoTimestamp
}

export interface NewRun {
  readonly borrowerId: BorrowerId
  readonly period: string
  readonly documentId: DocumentId
  readonly startedBy: string
}

export interface Note {
  readonly version: number
  readonly body: string
  readonly author: string
  readonly createdAt: IsoTimestamp
}

export interface Approval {
  readonly noteVersion: number
  readonly approver: string
  readonly approvedAt: IsoTimestamp
}

export interface AuditEvent {
  readonly id: number
  readonly at: IsoTimestamp
  readonly actor: string
  readonly kind: string
  readonly detail: Readonly<Record<string, JsonValue>>
}

/** A run as listed in the portfolio. */
export interface RunSummary {
  readonly id: RunId
  readonly borrowerId: BorrowerId
  readonly borrowerName: string
  readonly period: string
  readonly status: RunStatus
  readonly startedBy: string
  readonly createdAt: IsoTimestamp
  readonly breaches: number
  readonly watches: number
  /** Review issues still awaiting an analyst decision. */
  readonly openIssues: number
}

/** Everything needed to review and sign off a run. */
export interface RunDetail {
  readonly run: RunSummary
  readonly borrower: Borrower
  readonly document: DocumentRecord
  readonly figures: ReadonlyArray<VerifiedFigure>
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly certificateClaims: ReadonlyArray<VerifiedCertificateClaim>
  readonly certificateComparisons: ReadonlyArray<CertificateComparison>
  /** Why the certificate's figures differ, when one EBITDA explains them. */
  readonly ebitdaGap: EbitdaGap | null
  readonly issues: ReadonlyArray<Issue>
  readonly note: Note | null
  readonly approval: Approval | null
  readonly events: ReadonlyArray<AuditEvent>
}

/** A borrower's most recent monitoring run, as shown in the portfolio. */
export interface PortfolioRow {
  readonly borrower: Borrower
  readonly run: RunSummary | null
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly certificateComparisons: ReadonlyArray<CertificateComparison>
}

export interface PortfolioTotals {
  readonly facilities: number
  readonly facilityLimit: number
  readonly breaches: number
  readonly watches: number
  readonly certificateMismatches: number
  readonly openIssues: number
  readonly awaitingSignoff: number
}

export interface Portfolio {
  readonly rows: ReadonlyArray<PortfolioRow>
  readonly totals: PortfolioTotals
}
