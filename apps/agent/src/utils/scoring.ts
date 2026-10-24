import {
  compareCertificates,
  FIGURE_KEYS,
  type CovenantResult,
  type FigureKey,
  type FigureSet,
  type VerifiedCertificateClaim
} from "@covenant-desk/core"
import { answerKeyFigures } from "@covenant-desk/fixtures/answer-key"
import { PACK_PAGES } from "@covenant-desk/fixtures/constants"
import { certificateLines } from "@covenant-desk/fixtures/financials"
import type { PackSpec } from "@covenant-desk/fixtures/types"

export interface FigureScore {
  readonly key: FigureKey
  readonly expected: number
  readonly actual: number | null
  readonly correctValue: boolean
  readonly correctPage: boolean
}

export interface PackScore {
  readonly figures: ReadonlyArray<FigureScore>
  readonly figuresCorrect: number
  readonly covenantsCorrect: number
  readonly covenantsTotal: number
  readonly certificateCorrect: number
  readonly certificateTotal: number
  readonly mismatchesExpected: number
  readonly mismatchesFound: number
}

const VALUE_TOLERANCE = 1e-6

/** Scores a run's figures, covenant outcomes and note against the pack's answer key. */
export const scorePack = (
  spec: PackSpec,
  figures: FigureSet,
  covenants: ReadonlyArray<CovenantResult>,
  certificateClaims: ReadonlyArray<VerifiedCertificateClaim>
): PackScore => {
  const answers = answerKeyFigures(spec)
  const figureScores = FIGURE_KEYS.map((key): FigureScore => {
    const figure = figures[key]
    const { value, pages } = answers[key]
    return {
      key,
      expected: value,
      actual: figure?.value ?? null,
      correctValue: figure?.value === value,
      correctPage: figure !== undefined && pages.includes(figure.page)
    }
  })

  const lines = certificateLines(spec)
  const certificateCorrect = lines.filter((line) => {
    const claim = certificateClaims.find((c) => c.metric === line.metric)
    return (
      claim !== undefined &&
      Math.abs(claim.value - line.reported * line.scale) < VALUE_TOLERANCE &&
      claim.claimsCompliance === line.claimsCompliance &&
      claim.page === PACK_PAGES.complianceCertificate
    )
  }).length

  const mismatchesExpected = lines.filter((line) => {
    const covenant = spec.covenants.find((c) => c.metric === line.metric)
    const expectedStatus = covenant ? spec.expectedStatus[covenant.id] : undefined
    return expectedStatus !== undefined && line.claimsCompliance !== (expectedStatus !== "breach")
  }).length
  const mismatchesFound = compareCertificates(covenants, certificateClaims).filter((c) =>
    c.disagreements.includes("compliance")
  ).length

  return {
    figures: figureScores,
    figuresCorrect: figureScores.filter((f) => f.correctValue && f.correctPage).length,
    covenantsCorrect: covenants.filter((c) => spec.expectedStatus[c.covenantId] === c.status).length,
    covenantsTotal: Object.keys(spec.expectedStatus).length,
    certificateCorrect,
    certificateTotal: lines.length,
    mismatchesExpected,
    mismatchesFound
  }
}
