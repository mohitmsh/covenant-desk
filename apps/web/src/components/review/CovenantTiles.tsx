import { useState } from "react"
import { OPERATOR_SYMBOLS } from "@/constants"
import type { CertificateComparison, CovenantResult, VerifiedCertificateClaim, VerifiedFigure } from "@/types"
import { CERTIFICATE_VERDICTS, comparisonFor, describeCertificateClaim, disagreementLevel } from "@/utils/certificate"
import { sortCovenants } from "@/utils/covenants"
import { formatMetric, formatPercent } from "@/utils/format"
import { PageTag } from "@/components/ui/PageTag"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { CalculationPopover } from "./CalculationPopover"
import { HeadroomMeter } from "./HeadroomMeter"
import styles from "./CovenantTiles.module.css"

interface CovenantTilesProps {
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly figures: ReadonlyArray<VerifiedFigure>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
  readonly comparisons: ReadonlyArray<CertificateComparison>
  readonly focusedKey: string | null
  readonly onFocusFigure: (figure: VerifiedFigure) => void
  readonly onFocusClaim: (claim: VerifiedCertificateClaim) => void
}

export function CovenantTiles({
  covenants,
  figures,
  claims,
  comparisons,
  focusedKey,
  onFocusFigure,
  onFocusClaim
}: CovenantTilesProps) {
  const [openCovenant, setOpenCovenant] = useState<string | null>(null)

  return (
    <div className={styles.tiles}>
      {sortCovenants(covenants).map((covenant, index, sorted) => {
        const isOpen = openCovenant === covenant.covenantId
        const comparison = comparisonFor(comparisons, covenant.metric)
        const claim = claims.find((c) => c.metric === covenant.metric)
        return (
          <div
            key={covenant.covenantId}
            className={styles.anchor}
            data-popover-align={index === sorted.length - 1 ? "end" : "start"}
          >
            <button
              type="button"
              className={styles.tile}
              data-status={covenant.status}
              aria-expanded={isOpen}
              onClick={() => setOpenCovenant(isOpen ? null : covenant.covenantId)}
            >
              <span className={styles.header}>
                <span className={styles.name}>{covenant.name}</span>
                <StatusBadge status={covenant.status} />
              </span>
              <span className={styles.value}>{formatMetric(covenant.metric, covenant.actual)}</span>
              <HeadroomMeter covenant={covenant} />
              <span className={styles.footer}>
                <span className={styles.stat}>
                  <span className={styles.statLabel}>Limit</span>
                  {OPERATOR_SYMBOLS[covenant.operator]} {formatMetric(covenant.metric, covenant.limit)}
                </span>
                <span className={styles.stat} data-align="end" data-negative={covenant.headroom < 0}>
                  <span className={styles.statLabel}>{covenant.headroom < 0 ? "Over limit by" : "Headroom"}</span>
                  {formatPercent(Math.abs(covenant.headroom))}
                </span>
              </span>
            </button>
            {comparison && claim && (
              <div className={styles.certificate} data-disagrees={disagreementLevel(comparison)}>
                <span className={styles.certificateLabel}>{CERTIFICATE_VERDICTS[disagreementLevel(comparison)]}</span>
                <span className={styles.certificateValue}>{describeCertificateClaim(comparison)}</span>
                <PageTag
                  page={claim.page}
                  active={focusedKey === `certificate:${claim.metric}`}
                  onClick={() => onFocusClaim(claim)}
                />
              </div>
            )}
            {isOpen && (
              <CalculationPopover
                covenant={covenant}
                figures={figures}
                focusedFigure={focusedKey}
                onFocusFigure={onFocusFigure}
                onClose={() => setOpenCovenant(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
