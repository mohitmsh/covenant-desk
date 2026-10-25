import type { CertificateComparison, CovenantResult, EbitdaGap, VerifiedCertificateClaim } from "@/types"
import { disagreementLevel, hasDisagreement, type DisagreementLevel } from "@/utils/certificate"
import { formatMetric } from "@/utils/format"
import { PageTag } from "@/components/ui/PageTag"
import styles from "./CertificateBanner.module.css"

interface CertificateBannerProps {
  readonly comparisons: ReadonlyArray<CertificateComparison>
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
  readonly ebitdaGap: EbitdaGap | null
  readonly onShowClaim: (claim: VerifiedCertificateClaim) => void
}

const LEVEL_ORDER: Readonly<Record<DisagreementLevel, number>> = { compliance: 0, value: 1, none: 2 }

const RESULT_LABELS = {
  compliance: "Different outcome",
  value: "Same outcome, different figure",
  none: "Agrees"
} as const satisfies Record<DisagreementLevel, string>

const COMPLIANCE_WORDS = { true: "complies", false: "does not comply" } as const

/** `$470k`, from whole dollars. */
const thousands = (value: number) => `$${Math.round(Math.abs(value) / 1000).toLocaleString("en-AU")}k`

/** `4,350`, in the $'000 the pack prints. */
const printed = (value: number) => Math.round(value / 1000).toLocaleString("en-AU")

/** One sentence tracing the differences to the EBITDA the certificate used. */
const describeCause = (gap: EbitdaGap, disputed: number) =>
  `${disputed > 1 ? "Both differences come" : "The difference comes"} from ${thousands(gap.difference)} of ` +
  `${gap.difference > 0 ? "add-backs in" : "deductions from"} the certificate's EBITDA ` +
  `(${printed(gap.certificate)} vs ${printed(gap.reported)} in the P&L).`

/** The borrower's certificate against the tested results, one row per covenant, worst first. */
export function CertificateBanner({ comparisons, covenants, claims, ebitdaGap, onShowClaim }: CertificateBannerProps) {
  const disputed = comparisons.filter(hasDisagreement)
  if (disputed.length === 0) return null
  const rows = [...comparisons].sort((a, b) => LEVEL_ORDER[disagreementLevel(a)] - LEVEL_ORDER[disagreementLevel(b)])
  const worst = rows[0] ? disagreementLevel(rows[0]) : "none"

  return (
    <section className={styles.card} aria-labelledby="certificate-title">
      <h2 id="certificate-title" className={styles.title}>
        <span className={styles.dot} data-level={worst} aria-hidden />
        {worst === "compliance"
          ? "The compliance certificate disagrees with the tested results"
          : "The compliance certificate reports different figures with the same outcomes"}
      </h2>

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
                  <span className={styles.claim}> · {COMPLIANCE_WORDS[`${comparison.claimsCompliance}`]}</span>
                </td>
                <td className={styles.numeric}>
                  <strong>{formatMetric(comparison.metric, comparison.testedValue)}</strong>
                  <span className={styles.claim}> · {comparison.testedStatus}</span>
                </td>
                <td>
                  <span className={styles.result} data-level={level}>
                    <span className={styles.dot} data-level={level} aria-hidden />
                    {RESULT_LABELS[level]}
                    {claim && <PageTag page={claim.page} onClick={() => onShowClaim(claim)} />}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {ebitdaGap && <p className={styles.cause}>{describeCause(ebitdaGap, disputed.length)}</p>}
    </section>
  )
}
