import { PNL_COLUMN_FACTORS, THOUSAND } from "#constants"
import type { CertificateLine, BalanceSheetColumn, PackSpec, ProfitAndLossColumn } from "#types"

/** Builds a P&L column that ties exactly to the given revenue, EBITDA and interest. */
const profitAndLossColumn = (
  spec: PackSpec,
  revenue: number,
  ebitda: number,
  interest: number
): ProfitAndLossColumn => {
  const cogs = Math.round(revenue * spec.cogsPct)
  const grossProfit = revenue - cogs
  const opex = grossProfit - ebitda
  const da = Math.round(revenue * spec.daPct)
  const ebit = ebitda - da
  return { revenue, cogs, grossProfit, opex, ebitda, da, ebit, interest, npbt: ebit - interest }
}

/** P&L columns: month actual, month budget, year to date, TTM and prior-year TTM. */
export const profitAndLossColumns = (spec: PackSpec) => {
  const { revenue, ebitda, interest } = spec.ttm
  const monthly = (factors: { revenue: number; ebitda: number; interest: number }) =>
    profitAndLossColumn(
      spec,
      Math.round((revenue / 12) * factors.revenue),
      Math.round((ebitda / 12) * factors.ebitda),
      Math.round((interest / 12) * factors.interest)
    )
  const { priorTtm } = PNL_COLUMN_FACTORS
  return {
    month: monthly(PNL_COLUMN_FACTORS.month),
    budget: monthly(PNL_COLUMN_FACTORS.budget),
    yearToDate: monthly(PNL_COLUMN_FACTORS.yearToDate),
    ttm: profitAndLossColumn(spec, revenue, ebitda, interest),
    priorTtm: profitAndLossColumn(
      spec,
      Math.round(revenue * priorTtm.revenue),
      Math.round(ebitda * priorTtm.ebitda),
      Math.round(interest * priorTtm.interest)
    )
  }
}

/**
 * Builds a balance sheet column. `drift` scales working capital and fixed
 * assets so comparative periods differ.
 */
export const balanceSheetColumn = (
  spec: PackSpec,
  cash: number,
  rcfDrawn: number,
  drift: number
): BalanceSheetColumn => {
  const receivables = Math.round(spec.ttm.revenue * 0.11 * drift)
  const inventory = Math.round(spec.ttm.revenue * 0.04 * (2 - drift))
  const ppe = Math.round(spec.ttm.revenue * 0.42 * (1 + (drift - 1) / 3))
  const rightOfUse = Math.round(spec.ttm.revenue * 0.06)
  const payables = Math.round(spec.ttm.revenue * 0.08 * (1 + (drift - 1) / 2))
  const borrowingsCurrent = Math.round(spec.termLoan * 0.1)
  const borrowingsNonCurrent = spec.termLoan - borrowingsCurrent + rcfDrawn
  const leases = Math.round(rightOfUse * 1.04)
  const totalAssets = cash + receivables + inventory + ppe + rightOfUse
  const totalLiabilities = payables + borrowingsCurrent + borrowingsNonCurrent + leases
  return {
    cash,
    receivables,
    inventory,
    ppe,
    rightOfUse,
    totalAssets,
    payables,
    borrowingsCurrent,
    borrowingsNonCurrent,
    leases,
    totalLiabilities,
    netAssets: totalAssets - totalLiabilities
  }
}

export const totalDebt = (spec: PackSpec): number => spec.termLoan + spec.rcfDrawn

export const undrawnFacility = (spec: PackSpec): number => spec.rcfLimit - spec.rcfDrawn

const RATIO_DECIMALS = 2

/** The covenant results the borrower prints on its compliance certificate, using its own EBITDA. */
export const certificateLines = (spec: PackSpec): CertificateLine[] => {
  const limit = (metric: CertificateLine["metric"]) => spec.covenants.find((c) => c.metric === metric)?.limit ?? 0
  const ebitda = spec.certificateEbitda?.value ?? spec.ttm.ebitda
  const leverage = Number(((totalDebt(spec) - spec.cash) / ebitda).toFixed(RATIO_DECIMALS))
  const cover = Number((ebitda / spec.ttm.interest).toFixed(RATIO_DECIMALS))
  const liquidity = spec.cash + undrawnFacility(spec)
  return [
    {
      metric: "net_leverage",
      reported: leverage,
      scale: 1,
      printed: leverage.toFixed(RATIO_DECIMALS),
      claimsCompliance: leverage <= limit("net_leverage")
    },
    {
      metric: "interest_cover",
      reported: cover,
      scale: 1,
      printed: cover.toFixed(RATIO_DECIMALS),
      claimsCompliance: cover >= limit("interest_cover")
    },
    {
      metric: "minimum_liquidity",
      reported: liquidity,
      scale: THOUSAND,
      printed: liquidity.toLocaleString("en-AU"),
      claimsCompliance: liquidity * THOUSAND >= limit("minimum_liquidity")
    }
  ]
}
