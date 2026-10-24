import { METRICS } from "@covenant-desk/core/constants"
import type { CovenantResult, CovenantStatus } from "@/types"
import { formatCompactDollars as $ } from "./format"

const STATUS_SEVERITY: Readonly<Record<CovenantStatus, number>> = { breach: 0, watch: 1, pass: 2 }

/** Orders covenants as they appear in a facility agreement: leverage, cover, liquidity. */
export const sortCovenants = (covenants: ReadonlyArray<CovenantResult>): CovenantResult[] =>
  [...covenants].sort((a, b) => METRICS.indexOf(a.metric) - METRICS.indexOf(b.metric))

/** Most severe status across a run's covenants. */
export const worstStatus = (covenants: ReadonlyArray<CovenantResult>): CovenantStatus | null =>
  covenants.reduce<CovenantStatus | null>(
    (worst, c) => (worst === null || STATUS_SEVERITY[c.status] < STATUS_SEVERITY[worst] ? c.status : worst),
    null
  )

/** The covenant formula with its input values substituted, e.g. `($16.4m − $640k) ÷ $3.88m`. */
export const substitutedFormula = ({ metric, inputs }: CovenantResult): string => {
  const value = (amount: number | undefined) => $(amount ?? 0)
  switch (metric) {
    case "net_leverage":
      return `(${value(inputs.total_debt)} − ${value(inputs.cash)}) ÷ ${value(inputs.ebitda_ttm)}`
    case "interest_cover":
      return `${value(inputs.ebitda_ttm)} ÷ ${value(inputs.interest_expense_ttm)}`
    case "minimum_liquidity":
      return `${value(inputs.cash)} + ${value(inputs.undrawn_facility)}`
  }
}

const METER_HEADROOM = 1.2

/** Meter geometry: the tested value and the limit as fractions of a shared scale. */
export const meterPositions = ({ actual, limit }: CovenantResult): { value: number; limit: number } => {
  const scale = Math.max(actual, limit) * METER_HEADROOM
  return scale <= 0 ? { value: 0, limit: 0 } : { value: Math.max(0, actual) / scale, limit: limit / scale }
}
