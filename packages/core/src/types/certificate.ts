import type { CertificateClaimSchema } from "#schemas/certificate"
import type { CovenantStatus, Metric } from "#types/covenants"

export type CertificateClaim = typeof CertificateClaimSchema.Type

/** A certificate claim whose quote and number have been found on the cited page. */
export interface VerifiedCertificateClaim extends CertificateClaim {
  /** `reported × scale`: a ratio, or whole dollars. */
  readonly value: number
}

export type CertificateDisagreement = "value" | "compliance"

/** How the borrower's certificate compares with the tested result for one covenant. */
export interface CertificateComparison {
  readonly metric: Metric
  readonly certificateValue: number
  readonly testedValue: number
  readonly claimsCompliance: boolean
  readonly testedStatus: CovenantStatus
  readonly disagreements: ReadonlyArray<CertificateDisagreement>
}
