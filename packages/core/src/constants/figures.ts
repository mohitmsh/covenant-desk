/** Figures extracted from a borrower reporting pack. */
export const FIGURE_KEYS = [
  "revenue_ttm",
  "ebitda_ttm",
  "interest_expense_ttm",
  "total_debt",
  "cash",
  "undrawn_facility"
] as const

/** Display labels for each figure key. */
export const FIGURE_LABELS = {
  revenue_ttm: "Revenue (TTM)",
  ebitda_ttm: "EBITDA (TTM)",
  interest_expense_ttm: "Interest expense (TTM)",
  total_debt: "Total debt",
  cash: "Cash at bank",
  undrawn_facility: "Undrawn facility"
} as const satisfies Record<(typeof FIGURE_KEYS)[number], string>

/** Supported reporting units, as multipliers to whole dollars. */
export const SCALES = [1, 1_000, 1_000_000] as const

/** Minimum letters a source quote must contain to identify its row. */
export const MIN_QUOTE_LETTERS = 3

/** Tolerance when comparing a reported number with one parsed from a quote. */
export const NUMBER_MATCH_TOLERANCE = 1e-9
