import type { CertificateClaimSchema } from "#schemas/certificate"
import type { CovenantStatus, Metric } from "#types/covenants"
import type { PageBox } from "#types/pdf"

export type CertificateClaim = typeof CertificateClaimSchema.Type

/** A certificate claim whose quote and number have been found on the cited page. */
export interface VerifiedCertificateClaim extends CertificateClaim {
  /** `reported × scale`: a ratio, or whole dollars. */
  readonly value: number
  /** Where the quote sits on its page; null when the text layer cannot place it. */
  readonly box: PageBox | null
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

/** EBITDA the borrower's certificate implies, against EBITDA reported in the accounts. Whole dollars. */
export interface EbitdaGap {
  readonly certificate: number
  readonly reported: number
  /** Positive when the certificate uses more EBITDA than reported, e.g. through add-backs. */
  readonly difference: number
  /** Covenants whose certificate figure is explained by the gap. */
  readonly metrics: ReadonlyArray<Metric>
}
