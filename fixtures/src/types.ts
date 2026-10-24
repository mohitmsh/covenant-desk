import type { Borrower, CovenantDefinition, CovenantStatus, FigureKey, Metric, Scale } from "@covenant-desk/core"

/** Source data for one reporting pack. Amounts are in $'000. */
export interface PackSpec {
  readonly borrower: Borrower
  readonly covenants: ReadonlyArray<CovenantDefinition>
  /** `YYYY-MM`. */
  readonly period: string
  readonly periodLabel: string
  readonly cfo: string
  readonly sector: string
  readonly ttm: { readonly revenue: number; readonly ebitda: number; readonly interest: number }
  readonly cogsPct: number
  readonly daPct: number
  readonly termLoan: number
  readonly rcfLimit: number
  readonly rcfDrawn: number
  readonly cash: number
  readonly cashLastQuarter: number
  /** EBITDA used on the borrower's compliance certificate, where it differs from reported EBITDA. */
  readonly certificateEbitda?: { readonly value: number; readonly addBacks: string }
  readonly commentary: ReadonlyArray<string>
  /** Expected covenant outcome, keyed by covenant id. */
  readonly expectedStatus: Readonly<Record<string, CovenantStatus>>
}

export interface ProfitAndLossColumn {
  readonly revenue: number
  readonly cogs: number
  readonly grossProfit: number
  readonly opex: number
  readonly ebitda: number
  readonly da: number
  readonly ebit: number
  readonly interest: number
  readonly npbt: number
}

export interface BalanceSheetColumn {
  readonly cash: number
  readonly receivables: number
  readonly inventory: number
  readonly ppe: number
  readonly rightOfUse: number
  readonly totalAssets: number
  readonly payables: number
  readonly borrowingsCurrent: number
  readonly borrowingsNonCurrent: number
  readonly leases: number
  readonly totalLiabilities: number
  readonly netAssets: number
}

/** Correct value and acceptable source pages for one figure. */
export interface AnswerKeyEntry {
  readonly value: number
  readonly pages: ReadonlyArray<number>
}

/** Expected extraction and covenant results for one pack. */
export interface AnswerKey {
  readonly borrowerId: string
  readonly period: string
  readonly file: string
  readonly sha256: string
  readonly figures: Readonly<Record<FigureKey, AnswerKeyEntry>>
  readonly covenants: Readonly<Record<string, { readonly status: CovenantStatus; readonly actual: number }>>
}

/** A covenant result as printed on the borrower's compliance certificate. */
export interface CertificateLine {
  readonly metric: Metric
  /** Number as printed: a ratio to two decimals, or $'000. */
  readonly reported: number
  readonly scale: Scale
  readonly printed: string
  readonly claimsCompliance: boolean
}
