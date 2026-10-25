import { COMPLIANCE_WORDS, DISAGREEMENT_ORDER } from "@/constants"
import type { CertificateComparison, DisagreementLevel, EbitdaGap, Metric } from "@/types"
import { formatMetric, formatPrintedThousands, formatThousands } from "./format"

export const hasDisagreement = (comparison: CertificateComparison): boolean => comparison.disagreements.length > 0

/** `compliance` when the certificate reaches a different outcome, `value` when only the figure differs. */
export const disagreementLevel = (comparison: CertificateComparison): DisagreementLevel =>
  comparison.disagreements.includes("compliance")
    ? "compliance"
    : comparison.disagreements.length > 0
      ? "value"
      : "none"

export const comparisonFor = (
  comparisons: ReadonlyArray<CertificateComparison>,
  metric: Metric
): CertificateComparison | undefined => comparisons.find((c) => c.metric === metric)

/** Comparisons worst first: different outcomes, then different figures, then agreements. */
export const sortByDisagreement = (comparisons: ReadonlyArray<CertificateComparison>): CertificateComparison[] =>
  [...comparisons].sort((a, b) => DISAGREEMENT_ORDER[disagreementLevel(a)] - DISAGREEMENT_ORDER[disagreementLevel(b)])

export const describeCompliance = (complies: boolean): string => COMPLIANCE_WORDS[`${complies}`]

/** The certificate's statement for a covenant, e.g. `3.62× · complies`. */
export const describeCertificateClaim = (comparison: CertificateComparison): string =>
  `${formatMetric(comparison.metric, comparison.certificateValue)} · ${describeCompliance(comparison.claimsCompliance)}`

/** One sentence tracing the certificate's differences to the EBITDA it used. */
export const describeEbitdaGap = (gap: EbitdaGap, disputed: number): string =>
  `${disputed > 1 ? "Both differences come" : "The difference comes"} from ${formatThousands(gap.difference)} of ` +
  `${gap.difference > 0 ? "add-backs in" : "deductions from"} the certificate's EBITDA ` +
  `(${formatPrintedThousands(gap.certificate)} vs ${formatPrintedThousands(gap.reported)} in the P&L).`
