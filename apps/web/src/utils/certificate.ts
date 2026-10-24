import type { CertificateComparison, Metric } from "@/types"
import { formatMetric } from "./format"

const COMPLIANCE_WORDS = { true: "complies", false: "does not comply" } as const

export const hasDisagreement = (comparison: CertificateComparison): boolean => comparison.disagreements.length > 0

export const comparisonFor = (
  comparisons: ReadonlyArray<CertificateComparison>,
  metric: Metric
): CertificateComparison | undefined => comparisons.find((c) => c.metric === metric)

/** The certificate's statement for a covenant, e.g. `3.62× · complies`. */
export const describeCertificateClaim = (comparison: CertificateComparison): string =>
  `${formatMetric(comparison.metric, comparison.certificateValue)} · ${COMPLIANCE_WORDS[`${comparison.claimsCompliance}`]}`
