import { FIGURE_KEYS, type FigureKey, type FigureSet } from "@covenant-desk/core"
import { PACK_PAGES, THOUSAND } from "#constants"
import type { AnswerKeyEntry, PackSpec } from "#types"
import { totalDebt, undrawnFacility } from "#utils/financials"

/** Correct value, in whole dollars, and acceptable source pages for each figure. */
export const answerKeyFigures = (spec: PackSpec): Record<FigureKey, AnswerKeyEntry> => ({
  revenue_ttm: { value: spec.ttm.revenue * THOUSAND, pages: [PACK_PAGES.profitAndLoss] },
  ebitda_ttm: { value: spec.ttm.ebitda * THOUSAND, pages: [PACK_PAGES.profitAndLoss] },
  interest_expense_ttm: { value: spec.ttm.interest * THOUSAND, pages: [PACK_PAGES.profitAndLoss] },
  total_debt: { value: totalDebt(spec) * THOUSAND, pages: [PACK_PAGES.debtSchedule] },
  cash: { value: spec.cash * THOUSAND, pages: [PACK_PAGES.balanceSheet, PACK_PAGES.debtSchedule] },
  undrawn_facility: { value: undrawnFacility(spec) * THOUSAND, pages: [PACK_PAGES.debtSchedule] }
})

/** Answer key figures in the shape the covenant engine consumes. */
export const toFigureSet = (figures: Record<FigureKey, AnswerKeyEntry>): FigureSet => {
  const set: FigureSet = {}
  for (const key of FIGURE_KEYS) {
    const { value, pages } = figures[key]
    set[key] = { key, value, reported: value / THOUSAND, scale: THOUSAND, page: pages[0] ?? 1, quote: "" }
  }
  return set
}
