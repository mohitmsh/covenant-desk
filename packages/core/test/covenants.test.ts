import { DEFAULT_WATCH_HEADROOM, testCovenant, type CovenantDefinition, type FigureKey } from "@covenant-desk/core"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { figureSet } from "./support/figures"

const leverage: CovenantDefinition = {
  id: "lev",
  version: 2,
  name: "Net leverage",
  metric: "net_leverage",
  operator: "lte",
  limit: 3.5,
  watchHeadroom: DEFAULT_WATCH_HEADROOM
}
const cover: CovenantDefinition = {
  ...leverage,
  id: "icr",
  name: "Interest cover",
  metric: "interest_cover",
  operator: "gte",
  limit: 2
}
const liquidity: CovenantDefinition = {
  ...leverage,
  id: "liq",
  name: "Minimum liquidity",
  metric: "minimum_liquidity",
  operator: "gte",
  limit: 2_500_000
}

type Values = Partial<Record<FigureKey, number>>

const test = (def: CovenantDefinition, values: Values) => Effect.runSync(testCovenant(def, figureSet(values)))
const testError = (def: CovenantDefinition, values: Values) =>
  Effect.runSync(Effect.flip(testCovenant(def, figureSet(values))))

describe("net leverage", () => {
  it("computes (debt − cash) ÷ EBITDA", () => {
    const result = test(leverage, { total_debt: 19_850_000, cash: 3_420_000, ebitda_ttm: 7_940_000 })
    expect(result.actual).toBeCloseTo(2.0693, 4)
    expect(result.status).toBe("pass")
    expect(result.headroom).toBeCloseTo((3.5 - result.actual) / 3.5, 10)
  })

  it("reports watch inside the headroom threshold", () => {
    const result = test(leverage, { total_debt: 18_900_000, cash: 1_150_000, ebitda_ttm: 5_210_000 })
    expect(result.actual).toBeCloseTo(3.4069, 4)
    expect(result.status).toBe("watch")
  })

  it("reports breach above the limit with negative headroom", () => {
    const result = test({ ...leverage, limit: 3.75 }, { total_debt: 16_400_000, cash: 640_000, ebitda_ttm: 3_880_000 })
    expect(result.actual).toBeCloseTo(4.0619, 4)
    expect(result.status).toBe("breach")
    expect(result.headroom).toBeLessThan(0)
  })

  it("treats a value equal to a maximum as compliant", () => {
    const result = test(leverage, { total_debt: 3_500_000, cash: 0, ebitda_ttm: 1_000_000 })
    expect(result.headroom).toBe(0)
    expect(result.status).toBe("watch")
  })

  it("fails with NotMeaningful when EBITDA is not positive", () => {
    expect(testError(leverage, { total_debt: 1, cash: 0, ebitda_ttm: -5 })._tag).toBe("NotMeaningful")
  })

  it("fails with every missing input listed", () => {
    const error = testError(leverage, { cash: 1 })
    expect(error._tag).toBe("MissingFigures")
    expect(error._tag === "MissingFigures" && error.missing).toEqual(["total_debt", "ebitda_ttm"])
  })

  it("records the covenant version and only the inputs it used", () => {
    const result = test(leverage, { total_debt: 10, cash: 2, ebitda_ttm: 4, revenue_ttm: 99 })
    expect(result.covenantVersion).toBe(2)
    expect(result.inputs).toEqual({ total_debt: 10, cash: 2, ebitda_ttm: 4 })
  })
})

describe("interest cover", () => {
  it("passes above the minimum and breaches below it", () => {
    expect(test(cover, { ebitda_ttm: 7_940_000, interest_expense_ttm: 1_310_000 }).status).toBe("pass")
    expect(test(cover, { ebitda_ttm: 3_000_000, interest_expense_ttm: 2_000_000 }).status).toBe("breach")
  })

  it("fails with NotMeaningful when interest expense is zero", () => {
    expect(testError(cover, { ebitda_ttm: 1, interest_expense_ttm: 0 })._tag).toBe("NotMeaningful")
  })
})

describe("minimum liquidity", () => {
  it("adds cash and undrawn facility", () => {
    const result = test(liquidity, { cash: 640_000, undrawn_facility: 900_000 })
    expect(result.actual).toBe(1_540_000)
    expect(result.status).toBe("breach")
  })
})
