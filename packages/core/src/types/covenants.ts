import type { COVENANT_STATUSES, METRICS, OPERATORS } from "#constants/covenants"
import type { FigureKey } from "#types/figures"

export type Metric = (typeof METRICS)[number]

export type Operator = (typeof OPERATORS)[number]

export type CovenantStatus = (typeof COVENANT_STATUSES)[number]

export interface MetricDefinition {
  readonly inputs: ReadonlyArray<FigureKey>
  readonly unit: "ratio" | "dollars"
  readonly formula: string
}

/** A covenant from the facility agreement. A change in terms is a new version. */
export interface CovenantDefinition {
  readonly id: string
  readonly version: number
  readonly name: string
  readonly metric: Metric
  readonly operator: Operator
  /** Ratio or whole dollars, according to the metric's unit. */
  readonly limit: number
  readonly watchHeadroom: number
}

export interface CovenantResult {
  readonly covenantId: string
  readonly covenantVersion: number
  readonly name: string
  readonly metric: Metric
  readonly operator: Operator
  readonly limit: number
  readonly actual: number
  /** Share of the limit remaining. Negative when breached. */
  readonly headroom: number
  readonly status: CovenantStatus
  readonly formula: string
  /** Input values used, in whole dollars. */
  readonly inputs: Partial<Record<FigureKey, number>>
}

export type MetricComputation =
  { readonly kind: "value"; readonly value: number } | { readonly kind: "not_meaningful"; readonly reason: string }
