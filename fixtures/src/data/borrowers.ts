import { DEFAULT_WATCH_HEADROOM, BorrowerIdSchema, type CovenantDefinition } from "@covenant-desk/core"
import { Schema } from "effect"
import type { PackSpec } from "#types"

const borrowerId = Schema.decodeSync(BorrowerIdSchema)

const standardCovenants = (
  prefix: string,
  maxLeverage: number,
  minInterestCover: number,
  minLiquidity: number
): CovenantDefinition[] => [
  {
    id: `${prefix}-net-leverage`,
    version: 1,
    name: "Net leverage",
    metric: "net_leverage",
    operator: "lte",
    limit: maxLeverage,
    watchHeadroom: DEFAULT_WATCH_HEADROOM
  },
  {
    id: `${prefix}-interest-cover`,
    version: 1,
    name: "Interest cover",
    metric: "interest_cover",
    operator: "gte",
    limit: minInterestCover,
    watchHeadroom: DEFAULT_WATCH_HEADROOM
  },
  {
    id: `${prefix}-liquidity`,
    version: 1,
    name: "Minimum liquidity",
    metric: "minimum_liquidity",
    operator: "gte",
    limit: minLiquidity,
    watchHeadroom: DEFAULT_WATCH_HEADROOM
  }
]

/** Fictional borrowers: one compliant, one near its limits, one in breach. */
export const PACKS: ReadonlyArray<PackSpec> = [
  {
    borrower: {
      id: borrowerId("harbourline"),
      name: "Harbourline Freight Pty Ltd",
      facilityName: "Senior secured term loan and revolver",
      facilityLimit: 23_850_000,
      analyst: "Amelia Moreau"
    },
    covenants: standardCovenants("harbourline", 3.5, 2.0, 2_500_000),
    period: "2026-09",
    periodLabel: "September 2026",
    cfo: "Daniel Reyes",
    sector: "Road freight and warehousing",
    ttm: { revenue: 48_620, ebitda: 7_940, interest: 1_310 },
    cogsPct: 0.71,
    daPct: 0.038,
    termLoan: 15_000,
    rcfLimit: 8_850,
    rcfDrawn: 4_850,
    cash: 3_420,
    cashLastQuarter: 2_980,
    // Receivables printed as 5,438 rather than 5,348, so total assets no longer adds up.
    misprint: { row: "receivables", delta: 90 },
    commentary: [
      "Volumes on the Melbourne–Sydney linehaul were up 6% on the prior month, helped by the onboarding of two new retail customers in August. Fuel costs eased slightly and the fuel levy was passed through in full.",
      "Trading for the twelve months to September remains ahead of last year, with EBITDA of approximately $7.9m on revenue of $48.6m. Management expects the December quarter to be seasonally stronger.",
      "Two prime movers were replaced during the month under the existing capex plan. No new borrowings were drawn."
    ],
    expectedStatus: {
      "harbourline-net-leverage": "pass",
      "harbourline-interest-cover": "pass",
      "harbourline-liquidity": "pass"
    }
  },
  {
    borrower: {
      id: borrowerId("corella"),
      name: "Corella Fresh Foods Pty Ltd",
      facilityName: "Senior secured term loan and revolver",
      facilityLimit: 21_200_000,
      analyst: "Amelia Moreau"
    },
    covenants: standardCovenants("corella", 3.5, 2.25, 3_000_000),
    period: "2026-09",
    periodLabel: "September 2026",
    cfo: "Priyanka Sen",
    sector: "Fresh produce processing and distribution",
    ttm: { revenue: 61_300, ebitda: 5_210, interest: 2_140 },
    cogsPct: 0.78,
    daPct: 0.031,
    termLoan: 14_000,
    rcfLimit: 7_200,
    rcfDrawn: 4_900,
    cash: 1_150,
    cashLastQuarter: 1_870,
    commentary: [
      "September was a difficult month. Wet weather in the Lockyer Valley reduced supply and pushed input prices up, and we were not able to pass all of the increase on to our two largest supermarket customers.",
      "Gross margin for the month was the lowest this year. Twelve-month EBITDA is now $5.2m. We drew a further $1.2m on the revolver in August to fund higher working capital, and expect to repay part of this in November as receivables unwind.",
      "We are reviewing freight contracts and have deferred non-essential capex until conditions improve."
    ],
    expectedStatus: { "corella-net-leverage": "watch", "corella-interest-cover": "watch", "corella-liquidity": "pass" }
  },
  {
    borrower: {
      id: borrowerId("wattle-grove"),
      name: "Wattle Grove Aged Care Pty Ltd",
      facilityName: "Senior secured term loan and revolver",
      facilityLimit: 17_300_000,
      analyst: "Jonah Okafor"
    },
    covenants: standardCovenants("wattle-grove", 3.75, 2.0, 1_500_000),
    period: "2026-09",
    periodLabel: "September 2026",
    cfo: "Margaret Lindqvist",
    sector: "Residential aged care",
    ttm: { revenue: 29_750, ebitda: 3_880, interest: 1_720 },
    cogsPct: 0.62,
    daPct: 0.052,
    termLoan: 12_500,
    rcfLimit: 4_800,
    rcfDrawn: 3_900,
    cash: 640,
    cashLastQuarter: 1_310,
    certificateEbitda: {
      value: 4_350,
      addBacks: "one-off agency staffing costs ($310k) and consulting fees for the Ballarat redevelopment ($160k)"
    },
    commentary: [
      "Occupancy across our three homes averaged 91.4% in September, up from 89.8% in June. Agency staffing costs remain elevated while we recruit permanent registered nurses for the Ballarat home.",
      "On an adjusted basis, excluding one-off agency and redevelopment consulting costs, twelve-month EBITDA was $4.35m. We consider these costs non-recurring.",
      "Cash was lower at month end due to the timing of government funding receipts, which arrived on 2 October."
    ],
    expectedStatus: {
      "wattle-grove-net-leverage": "breach",
      "wattle-grove-interest-cover": "pass",
      "wattle-grove-liquidity": "watch"
    }
  }
]
