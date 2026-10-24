import { readFile } from "node:fs/promises"
import {
  decodeFigureClaim,
  parseNumbers,
  readPdfText,
  verifyFigure,
  type FigureClaim,
  type PdfText
} from "@covenant-desk/core"
import { Effect, Exit } from "effect"
import { beforeAll, describe, expect, it } from "vitest"
import { WATTLE_GROVE_PACK } from "./support/paths"

let pdf: PdfText

beforeAll(async () => {
  pdf = await Effect.runPromise(readPdfText(new Uint8Array(await readFile(WATTLE_GROVE_PACK))))
})

const ebitdaClaim: FigureClaim = {
  key: "ebitda_ttm",
  reported: 3880,
  scale: 1000,
  page: 3,
  quote: "EBITDA 304 349 931 3,880 3,764"
}

const verify = (overrides: Partial<FigureClaim> = {}) =>
  Effect.runSync(verifyFigure({ ...ebitdaClaim, ...overrides }, pdf))
const verifyError = (overrides: Partial<FigureClaim>) =>
  Effect.runSync(Effect.flip(verifyFigure({ ...ebitdaClaim, ...overrides }, pdf)))

describe("readPdfText", () => {
  it("extracts one string per page and hashes the file", () => {
    expect(pdf.pages).toHaveLength(6)
    expect(pdf.pages[2]).toContain("Profit and loss")
    expect(pdf.sha256).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("verifyFigure", () => {
  it("verifies a quote from the cited page and converts to whole dollars", () => {
    expect(verify().value).toBe(3_880_000)
  })

  it("ignores whitespace differences", () => {
    expect(verify({ quote: "EBITDA  304 349\n931 3,880" }).value).toBe(3_880_000)
  })

  it("matches bracketed expenses by magnitude", () => {
    const figure = verify({
      key: "interest_expense_ttm",
      reported: 1720,
      quote: "Interest expense (146) (140) (434) (1,720)"
    })
    expect(figure.value).toBe(1_720_000)
  })

  it("rejects a quote from another page and reports where it was found", () => {
    const error = verifyError({ page: 5 })
    expect(error._tag).toBe("QuoteNotFound")
    expect(error._tag === "QuoteNotFound" && error.foundOnPages).toEqual([3])
  })

  it("rejects a number that is not in the quote", () => {
    expect(verifyError({ reported: 3881 })._tag).toBe("ValueNotInQuote")
  })

  it("rejects text that does not appear in the document", () => {
    expect(verifyError({ quote: "EBITDA 3,880 (audited)" })._tag).toBe("QuoteNotFound")
  })

  it("rejects a quote without a row label", () => {
    expect(verifyError({ quote: "3,880" })._tag).toBe("QuoteTooVague")
  })

  it("rejects a page outside the document", () => {
    expect(verifyError({ page: 9 })._tag).toBe("PageOutOfRange")
  })

  it("verifies provenance only: the certificate's adjusted EBITDA is grounded text", () => {
    expect(verify({ reported: 4350, page: 6, quote: "EBITDA used below of 4,350" }).value).toBe(4_350_000)
  })
})

describe("decodeFigureClaim", () => {
  const decodes = (input: object) => Exit.isSuccess(Effect.runSyncExit(decodeFigureClaim(input)))

  it("accepts a well-formed claim", () => {
    expect(decodes(ebitdaClaim)).toBe(true)
  })

  it.each([
    ["an unknown figure key", { ...ebitdaClaim, key: "ebitda_adjusted" }],
    ["an unsupported scale", { ...ebitdaClaim, scale: 100 }],
    ["page zero", { ...ebitdaClaim, page: 0 }],
    ["a fractional page", { ...ebitdaClaim, page: 2.5 }],
    ["a number given as a string", { ...ebitdaClaim, reported: "3,880" }],
    ["an empty quote", { ...ebitdaClaim, quote: "" }]
  ])("rejects %s", (_, input) => {
    expect(decodes(input)).toBe(false)
  })
})

describe("parseNumbers", () => {
  it("parses financial statement formats", () => {
    expect(parseNumbers("Revenue 2,554 (1,583) 3.62x -640 $2.5")).toEqual([2554, 1583, 3.62, -640, 2.5])
  })
})
