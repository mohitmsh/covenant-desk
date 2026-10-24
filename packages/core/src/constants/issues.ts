export const ISSUE_KINDS = ["certificate_mismatch", "subtotal", "variance"] as const

export const ISSUE_STATUSES = ["open", "accepted", "overridden", "queried"] as const

export const ISSUE_ACTIONS = ["accept", "override", "query", "reopen"] as const

/** Status each analyst action moves an issue to. */
export const ISSUE_ACTION_STATUS = {
  accept: "accepted",
  override: "overridden",
  query: "queried",
  reopen: "open"
} as const

/** Largest difference, in the pack's printed units ($'000), put down to rounding when checking subtotals. */
export const SUBTOTAL_TOLERANCE = 1

/** Relative change against the prior period above which a line is flagged. */
export const VARIANCE_THRESHOLD = 0.25

/**
 * Subtotals that must equal the signed sum of their parts, per column. Amounts
 * are taken as printed, so bracketed costs are already negative.
 */
export const SUBTOTAL_RULES: ReadonlyArray<{
  readonly total: string
  readonly parts: ReadonlyArray<readonly [label: string, sign: 1 | -1]>
}> = [
  {
    total: "Gross profit",
    parts: [
      ["Revenue", 1],
      ["Cost of sales", 1]
    ]
  },
  {
    total: "EBITDA",
    parts: [
      ["Gross profit", 1],
      ["Operating expenses", 1]
    ]
  },
  {
    total: "EBIT",
    parts: [
      ["EBITDA", 1],
      ["Depreciation and amortisation", 1]
    ]
  },
  {
    total: "Net profit before tax",
    parts: [
      ["EBIT", 1],
      ["Interest expense", 1]
    ]
  },
  {
    total: "Total assets",
    parts: [
      ["Cash at bank", 1],
      ["Trade receivables", 1],
      ["Inventories", 1],
      ["Property, plant and equipment", 1],
      ["Right-of-use assets", 1]
    ]
  },
  {
    total: "Total liabilities",
    parts: [
      ["Trade payables", 1],
      ["Borrowings – current", 1],
      ["Borrowings – non-current", 1],
      ["Lease liabilities", 1]
    ]
  },
  {
    total: "Net assets",
    parts: [
      ["Total assets", 1],
      ["Total liabilities", -1]
    ]
  },
  {
    total: "Total debt",
    parts: [
      ["Senior term loan", 1],
      ["Revolving credit facility", 1]
    ]
  },
  {
    total: "Total available liquidity",
    parts: [
      ["Cash at bank", 1],
      ["Undrawn revolving credit facility", 1]
    ]
  }
]

/** Lines compared with the prior period. */
export const VARIANCE_LINES = ["Revenue", "EBITDA", "Interest expense", "Cash at bank", "Trade receivables"] as const

/**
 * Column pairs holding current and prior values. Tables with dated columns,
 * such as balance sheets, compare the latest date with the one before it.
 */
export const VARIANCE_COLUMNS: ReadonlyArray<readonly [current: string, prior: string]> = [["TTM Actual", "Prior TTM"]]
