import { CERTIFICATE_RESULT_LABELS } from "@/constants"
import type { CertificateComparison, CovenantResult, EbitdaGap, VerifiedCertificateClaim } from "@/types"
import {
  describeCompliance,
  describeEbitdaGap,
  disagreementLevel,
  hasDisagreement,
  sortByDisagreement
} from "@/utils/certificate"
import { formatMetric } from "@/utils/format"
import { PageTag } from "@/components/ui/PageTag"
import { StatusChip } from "@/components/ui/StatusChip"
import styles from "./CertificateBanner.module.css"

interface CertificateBannerProps {
  readonly comparisons: ReadonlyArray<CertificateComparison>
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
  readonly ebitdaGap: EbitdaGap | null
  readonly onShowClaim: (claim: VerifiedCertificateClaim) => void
}

/** The borrower's certificate against the tested results, one row per covenant, worst first. */
export function CertificateBanner({ comparisons, covenants, claims, ebitdaGap, onShowClaim }: CertificateBannerProps) {
  const disputed = comparisons.filter(hasDisagreement)
  if (disputed.length === 0) return null
  const rows = sortByDisagreement(comparisons)
  const worst = rows[0] ? disagreementLevel(rows[0]) : "none"

  return (
    <section className={styles.card} aria-labelledby="certificate-title">
      <header className={styles.header}>
        <h2 id="certificate-title" className={styles.title}>
          {worst === "compliance"
            ? "The compliance certificate disagrees with the tested results"
            : "The compliance certificate reports different figures with the same outcomes"}
        </h2>
        <StatusChip tone={worst === "compliance" ? "breach" : "watch"}>
          {disputed.length} of {comparisons.length} disagree
        </StatusChip>
      </header>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Covenant</th>
            <th className={styles.numeric}>Certificate</th>
            <th className={styles.numeric}>Tested</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((comparison) => {
            const level = disagreementLevel(comparison)
            const covenant = covenants.find((c) => c.metric === comparison.metric)
            const claim = claims.find((c) => c.metric === comparison.metric)
            return (
              <tr key={comparison.metric}>
                <td>{covenant?.name ?? comparison.metric}</td>
                <td className={styles.numeric}>
                  {formatMetric(comparison.metric, comparison.certificateValue)}
                  <span className={styles.claim}> · {describeCompliance(comparison.claimsCompliance)}</span>
                </td>
                <td className={styles.numeric}>
                  <strong>{formatMetric(comparison.metric, comparison.testedValue)}</strong>
                  <span className={styles.claim}> · {comparison.testedStatus}</span>
                </td>
                <td>
                  <span className={styles.result} data-level={level}>
                    <span className={styles.dot} data-level={level} aria-hidden />
                    {CERTIFICATE_RESULT_LABELS[level]}
                    {claim && <PageTag page={claim.page} onClick={() => onShowClaim(claim)} />}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {ebitdaGap && <p className={styles.cause}>{describeEbitdaGap(ebitdaGap, disputed.length)}</p>}
    </section>
  )
}
