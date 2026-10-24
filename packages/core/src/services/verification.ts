import { Effect, Schema } from "effect"
import { MIN_QUOTE_LETTERS } from "#constants/figures"
import { PageOutOfRange, QuoteNotFound, QuoteTooVague, ValueNotInQuote } from "#errors/verification"
import { CertificateClaimSchema } from "#schemas/certificate"
import { FigureClaimSchema } from "#schemas/figures"
import type { CertificateClaim, VerifiedCertificateClaim } from "#types/certificate"
import type { FigureClaim, VerifiedFigure } from "#types/figures"
import type { PdfText } from "#types/pdf"
import { locateQuote } from "#utils/layout"
import { parseNumbers, sameMagnitude } from "#utils/numbers"
import { canonicalText, countLetters } from "#utils/text"

interface SourceClaim {
  readonly reported: number
  readonly page: number
  readonly quote: string
}

/** Decodes an untrusted figure claim, e.g. LLM tool input. */
export const decodeFigureClaim = Schema.decodeUnknownEffect(FigureClaimSchema)

/** Decodes an untrusted certificate claim, e.g. LLM tool input. */
export const decodeCertificateClaim = Schema.decodeUnknownEffect(CertificateClaimSchema)

/**
 * Verifies that a quote includes a row label, appears on the cited page and
 * contains the reported number. Signs are compared by magnitude, so `(1,310)`
 * matches a reported `1310`.
 */
export const verifySource = (claim: SourceClaim, pdf: PdfText) =>
  Effect.gen(function* () {
    const pageText = pdf.pages[claim.page - 1]
    if (pageText === undefined) {
      return yield* new PageOutOfRange({ page: claim.page, pageCount: pdf.pages.length })
    }

    if (countLetters(claim.quote) < MIN_QUOTE_LETTERS) {
      return yield* new QuoteTooVague({ quote: claim.quote })
    }

    const quote = canonicalText(claim.quote)
    if (!canonicalText(pageText).includes(quote)) {
      const foundOnPages = pdf.pages.flatMap((text, index) => (canonicalText(text).includes(quote) ? [index + 1] : []))
      return yield* new QuoteNotFound({ page: claim.page, foundOnPages })
    }

    const numbersInQuote = parseNumbers(claim.quote)
    if (!numbersInQuote.some((n) => sameMagnitude(n, claim.reported))) {
      return yield* new ValueNotInQuote({ reported: claim.reported, numbersInQuote })
    }
  })

const sourceBox = (claim: SourceClaim, pdf: PdfText) => locateQuote(pdf.layout[claim.page - 1] ?? [], claim.quote)

/** Verifies a figure claim against the source document, converts it to whole dollars and locates it. */
export const verifyFigure = (claim: FigureClaim, pdf: PdfText) =>
  Effect.as(verifySource(claim, pdf), {
    ...claim,
    value: Math.abs(claim.reported) * claim.scale,
    box: sourceBox(claim, pdf)
  } satisfies VerifiedFigure)

/** Verifies a certificate claim against the source document and locates it. */
export const verifyCertificateClaim = (claim: CertificateClaim, pdf: PdfText) =>
  Effect.as(verifySource(claim, pdf), {
    ...claim,
    value: Math.abs(claim.reported) * claim.scale,
    box: sourceBox(claim, pdf)
  } satisfies VerifiedCertificateClaim)
