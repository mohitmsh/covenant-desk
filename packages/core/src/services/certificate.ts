import { CERTIFICATE_DOLLAR_TOLERANCE, CERTIFICATE_RATIO_DECIMALS, METRIC_DEFINITIONS } from "#constants/covenants"
import type {
  CertificateComparison,
  CertificateDisagreement,
  EbitdaGap,
  VerifiedCertificateClaim
} from "#types/certificate"
import type { CovenantResult, Metric } from "#types/covenants"

const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals))

/** Whether the certificate's figure is the tested figure, allowing for how certificates print numbers. */
const valuesAgree = (result: CovenantResult, claim: VerifiedCertificateClaim): boolean =>
  METRIC_DEFINITIONS[result.metric].unit === "ratio"
    ? roundTo(result.actual, CERTIFICATE_RATIO_DECIMALS) === roundTo(claim.value, CERTIFICATE_RATIO_DECIMALS)
    : Math.abs(result.actual - claim.value) <= Math.abs(result.actual) * CERTIFICATE_DOLLAR_TOLERANCE

/** Compares the borrower's certified result for a covenant with the tested result. */
export const compareCertificate = (result: CovenantResult, claim: VerifiedCertificateClaim): CertificateComparison => {
  const disagreements: CertificateDisagreement[] = []
  if (!valuesAgree(result, claim)) disagreements.push("value")
  if (claim.claimsCompliance !== (result.status !== "breach")) disagreements.push("compliance")
  return {
    metric: result.metric,
    certificateValue: claim.value,
    testedValue: result.actual,
    claimsCompliance: claim.claimsCompliance,
    testedStatus: result.status,
    disagreements
  }
}

/** Compares every covenant that has both a tested result and a certificate claim. */
export const compareCertificates = (
  results: ReadonlyArray<CovenantResult>,
  claims: ReadonlyArray<VerifiedCertificateClaim>
): CertificateComparison[] =>
  results.flatMap((result) => {
    const claim = claims.find((c) => c.metric === result.metric)
    return claim ? [compareCertificate(result, claim)] : []
  })

/** Implied EBITDAs must agree this closely to be put down to a single cause. */
const IMPLIED_EBITDA_AGREEMENT = 0.02

/** Differences smaller than this share of reported EBITDA are rounding, not a different EBITDA. */
const EBITDA_GAP_THRESHOLD = 0.005

/** Implied EBITDA is rounded to this, in whole dollars, since certificate ratios are printed to two decimals. */
const IMPLIED_EBITDA_ROUNDING = 10_000

/** EBITDA implied by a certificate's ratio and the tested inputs; null for covenants not based on EBITDA. */
const impliedEbitda = (result: CovenantResult, claim: VerifiedCertificateClaim): number | null => {
  const { total_debt: debt, cash, interest_expense_ttm: interest } = result.inputs
  if (claim.value <= 0) return null
  if (result.metric === "net_leverage" && debt !== undefined && cash !== undefined) return (debt - cash) / claim.value
  if (result.metric === "interest_cover" && interest !== undefined) return claim.value * interest
  return null
}

/**
 * Explains certificate figures that differ from the tested ones by a single
 * EBITDA: works back from each disputed ratio to the EBITDA the borrower must
 * have used, and returns the gap to reported EBITDA when they agree. Null when
 * no EBITDA-based covenant differs or the implied figures don't agree.
 */
export const certificateEbitdaGap = (
  results: ReadonlyArray<CovenantResult>,
  claims: ReadonlyArray<VerifiedCertificateClaim>
): EbitdaGap | null => {
  const implied = compareCertificates(results, claims).flatMap((comparison) => {
    const result = results.find((r) => r.metric === comparison.metric)
    const claim = claims.find((c) => c.metric === comparison.metric)
    if (!result || !claim || !comparison.disagreements.includes("value")) return []
    const value = impliedEbitda(result, claim)
    const reported = result.inputs.ebitda_ttm
    return value === null || reported === undefined ? [] : [{ metric: result.metric, value, reported }]
  })
  const [first] = implied
  if (!first) return null
  const values = implied.map((i) => i.value)
  if (Math.max(...values) - Math.min(...values) > first.value * IMPLIED_EBITDA_AGREEMENT) return null

  const average = values.reduce((sum, v) => sum + v, 0) / values.length
  const certificate = Math.round(average / IMPLIED_EBITDA_ROUNDING) * IMPLIED_EBITDA_ROUNDING
  const difference = certificate - first.reported
  if (Math.abs(difference) < first.reported * EBITDA_GAP_THRESHOLD) return null
  return {
    certificate,
    reported: first.reported,
    difference,
    metrics: implied.map((i): Metric => i.metric)
  }
}
