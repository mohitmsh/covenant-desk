import type { Metric } from "#types/covenants"

export const ISSUE_KINDS = ["certificate_mismatch", "subtotal", "variance", "period", "conflict"] as const

export const ISSUE_CATEGORIES = ["discrepancy", "explanation", "verify"] as const

/** Issue categories whose decisions may be remembered for a borrower's later packs: questions of how to read the pack. */
export const REMEMBERABLE_CATEGORIES: ReadonlyArray<(typeof ISSUE_CATEGORIES)[number]> = ["verify"]

export const ISSUE_STATUSES = ["open", "accepted", "overridden", "queried", "extraction_error"] as const

export const ISSUE_ACTIONS = ["accept", "override", "query", "mark_extraction_error", "reopen"] as const

/** Status each analyst action moves an issue to. */
export const ISSUE_ACTION_STATUS = {
  accept: "accepted",
  override: "overridden",
  query: "queried",
  mark_extraction_error: "extraction_error",
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

/** Covenant metrics each varying line feeds, so the issue can say why the movement matters. */
export const VARIANCE_METRICS: Readonly<Record<(typeof VARIANCE_LINES)[number], ReadonlyArray<Metric>>> = {
  Revenue: [],
  EBITDA: ["net_leverage", "interest_cover"],
  "Interest expense": ["interest_cover"],
  "Cash at bank": ["minimum_liquidity", "net_leverage"],
  "Trade receivables": []
}

/** What to look for when a line moves sharply. */
export const VARIANCE_CHECKS: Readonly<Record<(typeof VARIANCE_LINES)[number], ReadonlyArray<string>>> = {
  Revenue: [
    "Lost or new customers, or price changes, in the commentary",
    "A change in revenue recognition or one-off sales"
  ],
  EBITDA: [
    "Margin pressure or one-off costs explained in the commentary",
    "Whether the period's add-backs are permitted"
  ],
  "Interest expense": ["New drawings or a change in rates", "Fees or hedging costs booked to interest"],
  "Cash at bank": [
    "Debt repayments, capex or distributions in the period",
    "Cash moved to restricted or offset accounts",
    "Timing of receipts around the period end, which the commentary may explain"
  ],
  "Trade receivables": ["Slower collections or a large overdue customer", "Factoring or debtor finance arrangements"]
}

export const SUBTOTAL_CHECKS = [
  "Compare each line with the prior period to find the misstated one",
  "Ask the borrower to confirm the line and reissue the page"
] as const

export const CERTIFICATE_CHECKS = [
  "Compare the EBITDA used on the certificate with the profit and loss",
  "Check whether its add-backs are permitted by the facility's EBITDA definition",
  "Request a corrected certificate if the facility definition was not followed"
] as const

export const PERIOD_CHECKS = [
  "Confirm which period the borrower meant to send",
  "Request the pack for the period being tested before relying on these figures"
] as const

export const CONFLICT_CHECKS = [
  "Ask the borrower which page is correct",
  "Check which figure the covenant test used, and re-test if it was the wrong one"
] as const

/** Issues are listed worst first: discrepancies, then questions to verify, then movements to explain. */
export const ISSUE_CATEGORY_ORDER = { discrepancy: 0, verify: 1, explanation: 2 } as const

export const ISSUE_SEVERITY_ORDER = { high: 0, medium: 1 } as const

/** Average month length, for telling a monthly comparative from a quarterly or annual one. */
export const AVERAGE_MONTH_MS = 30.44 * 24 * 60 * 60 * 1000

/** Where a pack's cover states its period: `reporting for September 2026`, `month ended 30 September 2026`. */
export const STATED_PERIOD_PATTERN = /(?:reporting for|month ended \d{1,2})\s+([A-Z][a-z]+ \d{4})/
