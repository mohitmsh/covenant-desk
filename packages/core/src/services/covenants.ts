import { Effect } from "effect"
import { METRIC_DEFINITIONS } from "#constants/covenants"
import { MissingFigures, NotMeaningful } from "#errors/covenants"
import type {
  CovenantDefinition,
  CovenantResult,
  CovenantStatus,
  Metric,
  MetricComputation,
  Operator
} from "#types/covenants"
import type { FigureKey, FigureSet } from "#types/figures"

type FigureValue = (key: FigureKey) => number

/** Computes a covenant metric from whole-dollar figure values. */
export const computeMetric = (metric: Metric, value: FigureValue): MetricComputation => {
  switch (metric) {
    case "net_leverage":
      return value("ebitda_ttm") <= 0
        ? { kind: "not_meaningful", reason: "EBITDA is zero or negative" }
        : { kind: "value", value: (value("total_debt") - value("cash")) / value("ebitda_ttm") }
    case "interest_cover":
      return value("interest_expense_ttm") <= 0
        ? { kind: "not_meaningful", reason: "Interest expense is zero or negative" }
        : { kind: "value", value: value("ebitda_ttm") / value("interest_expense_ttm") }
    case "minimum_liquidity":
      return { kind: "value", value: value("cash") + value("undrawn_facility") }
  }
}

/** Share of the limit remaining. Negative when the covenant is breached. */
export const headroom = (operator: Operator, actual: number, limit: number): number =>
  operator === "lte" ? (limit - actual) / limit : (actual - limit) / limit

/** Classifies headroom against the covenant's watch threshold. */
export const statusFor = (headroomValue: number, watchHeadroom: number): CovenantStatus =>
  headroomValue < 0 ? "breach" : headroomValue < watchHeadroom ? "watch" : "pass"

/**
 * Tests one covenant against verified figures.
 * Values are compared at full precision; rounding applies to display only.
 */
export const testCovenant = (def: CovenantDefinition, figures: FigureSet) =>
  Effect.gen(function* () {
    const { inputs: keys, formula } = METRIC_DEFINITIONS[def.metric]
    const inputs: Partial<Record<FigureKey, number>> = {}
    const missing: FigureKey[] = []
    for (const key of keys) {
      const figure = figures[key]
      if (figure === undefined) missing.push(key)
      else inputs[key] = figure.value
    }
    if (missing.length > 0) {
      return yield* new MissingFigures({ covenantId: def.id, missing })
    }

    const computation = computeMetric(def.metric, (key) => inputs[key] ?? 0)
    if (computation.kind === "not_meaningful") {
      return yield* new NotMeaningful({ covenantId: def.id, reason: computation.reason })
    }

    const actual = computation.value
    const remaining = headroom(def.operator, actual, def.limit)

    return {
      covenantId: def.id,
      covenantVersion: def.version,
      name: def.name,
      metric: def.metric,
      operator: def.operator,
      limit: def.limit,
      actual,
      headroom: remaining,
      status: statusFor(remaining, def.watchHeadroom),
      formula,
      inputs
    } satisfies CovenantResult
  })

/** Tests every covenant, failing on the first that cannot be computed. */
export const testAll = (defs: ReadonlyArray<CovenantDefinition>, figures: FigureSet) =>
  Effect.forEach(defs, (def) => testCovenant(def, figures))
