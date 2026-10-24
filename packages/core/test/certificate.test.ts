import { compareCertificate, type CovenantResult, type VerifiedCertificateClaim } from "@covenant-desk/core"
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
