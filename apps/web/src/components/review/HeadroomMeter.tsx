import type { CovenantResult } from "@/types"
import { meterPositions } from "@/utils/covenants"
import { formatMetric } from "@/utils/format"
import styles from "./HeadroomMeter.module.css"

interface HeadroomMeterProps {
  readonly covenant: CovenantResult
}

const toPercent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`

/** Tested value against the covenant limit on a shared scale. */
export function HeadroomMeter({ covenant }: HeadroomMeterProps) {
  const position = meterPositions(covenant)
  const relation = covenant.operator === "lte" ? "maximum" : "minimum"

  return (
    <div
      className={styles.meter}
      data-status={covenant.status}
      role="img"
      aria-label={`${formatMetric(covenant.metric, covenant.actual)} against a ${relation} of ${formatMetric(covenant.metric, covenant.limit)}`}
    >
      <span className={styles.fill} style={{ width: toPercent(position.value) }} />
      <span className={styles.limit} style={{ left: toPercent(position.limit) }} />
    </div>
  )
}
