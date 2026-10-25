import type { MetricDefinition } from "#types/covenants"

export const METRICS = ["net_leverage", "interest_cover", "minimum_liquidity"] as const

export const OPERATORS = ["lte", "gte"] as const

export const COVENANT_STATUSES = ["pass", "watch", "breach"] as const

/** Headroom below which a compliant result is reported as `watch`. */
export const DEFAULT_WATCH_HEADROOM = 0.1

/** Inputs, unit and formula for each covenant metric. */
export const METRIC_DEFINITIONS = {
  net_leverage: {
    inputs: ["total_debt", "cash", "ebitda_ttm"],
    unit: "ratio",
    formula: "(Total debt − Cash) ÷ EBITDA (TTM)"
  },
  interest_cover: {
    inputs: ["ebitda_ttm", "interest_expense_ttm"],
    unit: "ratio",
    formula: "EBITDA (TTM) ÷ Interest expense (TTM)"
  },
  minimum_liquidity: {
    inputs: ["cash", "undrawn_facility"],
    unit: "dollars",
    formula: "Cash + Undrawn facility"
  }
} as const satisfies Record<(typeof METRICS)[number], MetricDefinition>

/** Decimal places ratios are printed to on compliance certificates. */
export const CERTIFICATE_RATIO_DECIMALS = 2

/** Relative difference within which a certificate's dollar amount agrees with the tested amount. */
export const CERTIFICATE_DOLLAR_TOLERANCE = 0.005

/** How a limit is described: a maximum for `lte` covenants, a minimum for `gte`. */
export const LIMIT_WORDS = { lte: "maximum", gte: "minimum" } as const
