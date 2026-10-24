import { CERTIFICATE_DOLLAR_TOLERANCE, CERTIFICATE_RATIO_DECIMALS, METRIC_DEFINITIONS } from "#constants/covenants"
import type { CertificateComparison, CertificateDisagreement, VerifiedCertificateClaim } from "#types/certificate"
import type { CovenantResult } from "#types/covenants"

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
