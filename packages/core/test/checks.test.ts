import { readFile } from "node:fs/promises"
import { computeIssues, parseAmount, readPdfText, readTableRows, verifyFigure, type PdfText } from "@covenant-desk/core"
import { Effect } from "effect"
import { beforeAll, describe, expect, it } from "vitest"
import { HARBOURLINE_PACK, WATTLE_GROVE_PACK } from "./support/paths"

let wattle: PdfText
let harbourline: PdfText

beforeAll(async () => {
  const read = async (path: string) => Effect.runPromise(readPdfText(new Uint8Array(await readFile(path))))
  ;[wattle, harbourline] = await Promise.all([read(WATTLE_GROVE_PACK), read(HARBOURLINE_PACK)])
})

describe("parseAmount", () => {
  it("reads amounts as printed in financial statements", () => {
    expect(parseAmount("1,310")).toBe(1310)
    expect(parseAmount("(1,310)")).toBe(-1310)
    expect(parseAmount("–")).toBe(0)
    expect(parseAmount("Revenue")).toBeNull()
    expect(parseAmount("3.62x")).toBeNull()
  })
})

describe("readTableRows", () => {
  it("assigns each amount to its column header", () => {
    const cash = readTableRows(wattle.layout[3] ?? []).find((row) => row.label === "Cash at bank")
    expect(cash?.cells.map((cell) => [cell.column, cell.value])).toEqual([
      ["30 Sep 2026", 640],
      ["30 Jun 2026", 1310]
    ])
  })
})

describe("verifyFigure", () => {
  it("locates the quote on its page", () => {
    const figure = Effect.runSync(
      verifyFigure({ key: "cash", reported: 640, scale: 1000, page: 4, quote: "Cash at bank 640 1,310" }, wattle)
    )
    expect(figure.box).not.toBeNull()
    expect(figure.box?.y).toBeGreaterThan(0)
    expect(figure.box?.y).toBeLessThan(0.5)
    // Outlined on the 640 cell, not across the whole row.
    expect(figure.box?.x).toBeGreaterThan(0.5)
    expect(figure.box?.width).toBeLessThan(0.1)
  })
})

describe("computeIssues", () => {
  it("finds a total that does not add up", () => {
    const issues = computeIssues({ pdf: harbourline, period: "2026-09", covenants: [], claims: [] })
    expect(issues.map((i) => i.key)).toEqual(["subtotal:p4:Total assets"])
    expect(issues[0]?.detail).toBe(
      "30 Sep 2026: printed $34,050k, but its lines come to $34,140k, a difference of $90k."
    )
    expect(issues[0]?.box).not.toBeNull()
  })

  it("flags large changes on the prior period, and accepts bracketed negative totals", () => {
    const issues = computeIssues({ pdf: wattle, period: "2026-09", covenants: [], claims: [] })
    expect(issues.map((i) => i.key)).toEqual(["variance:p4:Cash at bank"])
    expect(issues[0]?.title).toBe("Cash at bank down 51% on the prior quarter ($1.31m → $0.64m)")
  })

  it("raises a certificate claim that disagrees with the tested result", () => {
    const issues = computeIssues({
      pdf: wattle,
      period: "2026-09",
      covenants: [
        {
          covenantId: "lev",
          covenantVersion: 1,
          name: "Net leverage",
          formula: "",
          inputs: {},
          metric: "net_leverage",
          operator: "lte",
          limit: 3.75,
          actual: 4.06,
          headroom: -0.083,
          status: "breach"
        }
      ],
      claims: [
        {
          metric: "net_leverage",
          reported: 3.62,
          scale: 1,
          value: 3.62,
          claimsCompliance: true,
          page: 6,
          quote: "Net leverage ratio 3.62x",
          box: { x: 0.1, y: 0.3, width: 0.5, height: 0.02 }
        }
      ]
    })
    const certificate = issues.find((i) => i.kind === "certificate_mismatch")
    expect(certificate).toMatchObject({ key: "certificate:net_leverage", severity: "high", page: 6 })
    expect(certificate?.title).toBe("Certificate says net leverage complies; tested result is a breach")
  })

  it("asks for verification when the pack is for a different period", () => {
    const issues = computeIssues({ pdf: harbourline, period: "2026-08", covenants: [], claims: [] })
    const period = issues.find((i) => i.kind === "period")
    expect(period).toMatchObject({ category: "verify", page: 1 })
    expect(period?.title).toBe("Pack is for September 2026, not the August 2026 period being tested")
    expect(period?.box).not.toBeNull()
  })

  it("links a large change to both source cells and the covenants it feeds", () => {
    const [cash] = computeIssues({
      pdf: wattle,
      period: "2026-09",
      covenants: [
        {
          covenantId: "liq",
          covenantVersion: 1,
          name: "Minimum liquidity",
          formula: "",
          inputs: {},
          metric: "minimum_liquidity",
          operator: "gte",
          limit: 1_500_000,
          actual: 1_540_000,
          headroom: 0.027,
          status: "watch"
        }
      ],
      claims: []
    })
    expect(cash?.category).toBe("explanation")
    expect(cash?.evidence.map((e) => [e.label, e.value, e.page])).toEqual([
      ["30 Jun 2026", "$1,310k", 4],
      ["30 Sep 2026", "$640k", 4]
    ])
    expect(cash?.evidence.every((e) => e.box !== null)).toBe(true)
    expect(cash?.impact).toBe(
      "Feeds a covenant: Minimum liquidity $1.54m against a $1.50m minimum (2.7% headroom, watch)."
    )
    expect(cash?.checks.length).toBeGreaterThan(0)
  })
})
