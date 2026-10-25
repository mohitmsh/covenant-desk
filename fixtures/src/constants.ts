import type { FigureKey, Metric } from "@covenant-desk/core"
import { fileURLToPath } from "node:url"

/** Fictional lender the packs are addressed to. */
export const LENDER = "Tallowwood Credit Partners"

/** Packs report in $'000. */
export const THOUSAND = 1_000

/** Page on which each section of a reporting pack appears. */
export const PACK_PAGES = {
  cover: 1,
  commentary: 2,
  profitAndLoss: 3,
  balanceSheet: 4,
  debtSchedule: 5,
  complianceCertificate: 6
} as const

export const PACK_PAGE_COUNT = 6

/** Date from which seeded covenant definitions apply. */
export const COVENANTS_EFFECTIVE_FROM = "2025-07-01"

export const PACKS_DIR = fileURLToPath(new URL("../packs/", import.meta.url))

/** Eval packs, expectations and results. Expectations are kept apart from the packs the agent reads. */
export const EVALS_DIR = fileURLToPath(new URL("../evals/", import.meta.url))

/** Fixtures root, against which eval pack paths are resolved. */
export const FIXTURES_DIR = fileURLToPath(new URL("../", import.meta.url))

/** Real agent runs on the packs, saved for replay when seeding the demo. */
export const RECORDINGS_DIR = fileURLToPath(new URL("../recordings/", import.meta.url))

/** Factors applied to TTM values to derive the other P&L columns. */
export const PNL_COLUMN_FACTORS = {
  month: { revenue: 1.03, ebitda: 0.94, interest: 1.02 },
  budget: { revenue: 1.07, ebitda: 1.08, interest: 0.98 },
  yearToDate: { revenue: 3.06, ebitda: 2.88, interest: 3.03 },
  priorTtm: { revenue: 0.93, ebitda: 0.97, interest: 0.9 }
} as const

/** Comparative balance sheet: revolver drawn lower by this amount, working capital scaled by `drift`. */
export const COMPARATIVE_BALANCE_SHEET = { rcfReduction: 600, drift: 0.955 } as const

/** Row label each figure is read from on its source page. */
export const FIGURE_SOURCE_LABELS = {
  revenue_ttm: "Revenue",
  ebitda_ttm: "EBITDA",
  interest_expense_ttm: "Interest expense",
  total_debt: "Total debt",
  cash: "Cash at bank",
  undrawn_facility: "Undrawn revolving credit facility"
} as const satisfies Record<FigureKey, string>

/** Actor recorded on runs created from answer keys rather than by an agent. */
export const SEED_ACTOR = "seed:answer-key"

/** Row label each covenant is reported under on the compliance certificate. */
export const CERTIFICATE_LABELS = {
  net_leverage: "Net leverage ratio",
  interest_cover: "Interest cover ratio",
  minimum_liquidity: "Minimum liquidity ($'000)"
} as const satisfies Record<Metric, string>
