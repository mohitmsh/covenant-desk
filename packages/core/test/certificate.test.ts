import {
  certificateEbitdaGap,
  compareCertificate,
  type CovenantResult,
  type VerifiedCertificateClaim
} from "@covenant-desk/core"
import { describe, expect, it } from "vitest"

const leverage: CovenantResult = {
  covenantId: "lev",
  covenantVersion: 1,
  name: "Net leverage",
  metric: "net_leverage",
  operator: "lte",
  limit: 3.75,
  actual: 4.0619,
  headroom: -0.083,
  status: "breach",
  formula: "",
  inputs: {}
}

const liquidity: CovenantResult = {
  ...leverage,
  covenantId: "liq",
  metric: "minimum_liquidity",
  operator: "gte",
  limit: 1_500_000,
  actual: 1_540_000,
  headroom: 0.027,
  status: "watch"
}

const claim = (overrides: Partial<VerifiedCertificateClaim>): VerifiedCertificateClaim => ({
  metric: "net_leverage",
  reported: 4.06,
  scale: 1,
  value: 4.06,
  claimsCompliance: false,
  page: 6,
  quote: "Net leverage ratio 4.06",
  box: null,
  ...overrides
})

describe("compareCertificate", () => {
  it("agrees when the certificate prints the tested ratio to two decimals", () => {
    expect(compareCertificate(leverage, claim({})).disagreements).toEqual([])
  })

  it("flags a different ratio and an unsupported claim of compliance", () => {
    const comparison = compareCertificate(leverage, claim({ reported: 3.62, value: 3.62, claimsCompliance: true }))
    expect(comparison.disagreements).toEqual(["value", "compliance"])
  })

  it("treats a covenant on watch as compliant", () => {
    const comparison = compareCertificate(
      liquidity,
      claim({ metric: "minimum_liquidity", reported: 1540, scale: 1000, value: 1_540_000, claimsCompliance: true })
    )
    expect(comparison.disagreements).toEqual([])
  })

  it("allows rounding in dollar amounts printed in thousands", () => {
    const comparison = compareCertificate(
      { ...liquidity, actual: 1_540_400 },
      claim({ metric: "minimum_liquidity", reported: 1540, scale: 1000, value: 1_540_000, claimsCompliance: true })
    )
    expect(comparison.disagreements).toEqual([])
  })
})

describe("certificateEbitdaGap", () => {
  const inputs = { total_debt: 16_400_000, cash: 640_000, ebitda_ttm: 3_880_000, interest_expense_ttm: 1_720_000 }
  const tested = (metric: "net_leverage" | "interest_cover", actual: number, status: "pass" | "breach") => ({
    ...leverage,
    covenantId: metric,
    metric,
    actual,
    status,
    inputs
  })

  it("traces both certificate ratios back to one EBITDA with add-backs", () => {
    const gap = certificateEbitdaGap(
      [tested("net_leverage", 4.06, "breach"), tested("interest_cover", 2.26, "pass")],
      [
        claim({ metric: "net_leverage", reported: 3.62, value: 3.62, claimsCompliance: true }),
        claim({ metric: "interest_cover", reported: 2.53, value: 2.53, claimsCompliance: true })
      ]
    )
    expect(gap).toEqual({
      certificate: 4_350_000,
      reported: 3_880_000,
      difference: 470_000,
      metrics: ["net_leverage", "interest_cover"]
    })
  })

  it("is null when the certificate agrees", () => {
    expect(
      certificateEbitdaGap([tested("net_leverage", 4.06, "breach")], [claim({ claimsCompliance: false })])
    ).toBeNull()
  })
})
