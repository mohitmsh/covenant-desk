import type {
  Borrower,
  CovenantDefinition,
  CovenantStatus,
  FigureKey,
  IssueKind,
  Metric,
  Scale
} from "@covenant-desk/core"

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
  /** A deliberate error in the current balance sheet column, for the subtotal check to find. */
  readonly misprint?: { readonly row: keyof BalanceSheetColumn; readonly delta: number }
  /** Pages printed in $ millions instead of $'000, as a units trap. */
  readonly unitsInMillions?: ReadonlyArray<"balanceSheet" | "debtSchedule">
  /** Cash printed on the debt schedule when it should match the balance sheet, so two pages conflict. $'000. */
  readonly debtScheduleCash?: number
  /** Text hidden in the commentary (white, tiny), addressed to an AI reviewer. */
  readonly injection?: string
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

export type EvalCategory = "normal" | "unseen" | "units" | "period" | "conflict" | "injection"

/** A test case for the agent pipeline: a pack, the period it is tested as, and what must come out. */
export interface EvalCase {
  readonly id: string
  readonly name: string
  readonly category: EvalCategory
  readonly description: string
  readonly spec: PackSpec
  /** Pack file to use instead of rendering `spec`, relative to the fixtures directory. */
  readonly existingPack?: string
  /** Period the run tests, when it differs from the pack's own. */
  readonly runPeriod?: string
  readonly expect: EvalExpectationInput
}

/** Expectations written by hand; figures and covenant results are derived from the pack spec. */
export interface EvalExpectationInput {
  /** Accept any of these values for a figure, in whole dollars, e.g. when two pages disagree. */
  readonly figureAlternatives?: Partial<Record<FigureKey, ReadonlyArray<number>>>
  /** Allowed difference for figures, in whole dollars, e.g. for pages printed in $m. */
  readonly figureTolerance?: number
  readonly issuesPresent?: ReadonlyArray<IssueKind>
  readonly issuesAbsent?: ReadonlyArray<IssueKind>
  readonly certificateDisagrees?: boolean
  /** The note must contain each of these, case-insensitive. */
  readonly noteMentions?: ReadonlyArray<string>
  /** The note must not contain any of these, case-insensitive. */
  readonly noteAvoids?: ReadonlyArray<string>
  /**
   * The note's conclusion, its first paragraph, must not contain any of these. Checked there rather
   * than in the whole note, which may quote an injected instruction in order to report it.
   */
  readonly conclusionAvoids?: ReadonlyArray<string>
}

/** Everything a case must produce, stored apart from the pack so the agent never sees it. */
export interface EvalExpectation extends EvalExpectationInput {
  readonly id: string
  readonly name: string
  readonly category: EvalCategory
  readonly description: string
  readonly borrowerId: string
  readonly pack: string
  readonly runPeriod: string
  readonly figures: Readonly<Record<FigureKey, number>>
  readonly covenants: Readonly<Partial<Record<Metric, CovenantStatus>>>
}
