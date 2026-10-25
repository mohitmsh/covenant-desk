import { COVENANT_STATUS_LABELS } from "@/constants"
import type { CertificateComparison, CovenantResult, VerifiedCertificateClaim } from "@/types"
import { describeCertificateClaim, disagreementLevel, hasDisagreement } from "@/utils/certificate"
import { formatMetric } from "@/utils/format"
import { PageTag } from "@/components/ui/PageTag"
import styles from "./CertificateBanner.module.css"

interface CertificateBannerProps {
  readonly comparisons: ReadonlyArray<CertificateComparison>
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
  readonly onShowClaim: (claim: VerifiedCertificateClaim) => void
}

/** Calls out covenants where the borrower's certificate contradicts the tested result. */
export function CertificateBanner({ comparisons, covenants, claims, onShowClaim }: CertificateBannerProps) {
  const disputed = comparisons.filter(hasDisagreement)
  if (disputed.length === 0) return null
  const outcomeDisputed = disputed.some((comparison) => disagreementLevel(comparison) === "compliance")

  return (
    <section className={styles.banner} role="alert" data-level={outcomeDisputed ? "compliance" : "value"}>
      <div className={styles.icon} aria-hidden>
        !
      </div>
      <div className={styles.body}>
        <p className={styles.title}>
          {outcomeDisputed
            ? "The compliance certificate disagrees with the tested results"
            : "The compliance certificate reports different figures, with the same outcomes"}
        </p>
        <ul className={styles.items}>
          {disputed.map((comparison) => {
            const covenant = covenants.find((c) => c.metric === comparison.metric)
            const claim = claims.find((c) => c.metric === comparison.metric)
            return (
              <li key={comparison.metric} className={styles.item} data-level={disagreementLevel(comparison)}>
                <span className={styles.name}>{covenant?.name ?? comparison.metric}</span>
                <span>
                  Certificate <strong>{describeCertificateClaim(comparison)}</strong>
                </span>
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
                <span>
                  Tested <strong>{formatMetric(comparison.metric, comparison.testedValue)}</strong> ·{" "}
                  {COVENANT_STATUS_LABELS[comparison.testedStatus].toLowerCase()}
                </span>
                {claim && <PageTag page={claim.page} onClick={() => onShowClaim(claim)} />}
                <span className={styles.verdict}>
                  {disagreementLevel(comparison) === "compliance"
                    ? "Different outcome"
                    : "Same outcome, different figure"}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
