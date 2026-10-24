import { COVENANT_STATUS_LABELS } from "@/constants"
import type { CovenantStatus } from "@/types"
import { StatusDot } from "./StatusDot"
import styles from "./StatusBadge.module.css"

interface StatusBadgeProps {
  readonly status: CovenantStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={styles.badge} data-status={status}>
      <StatusDot status={status} />
      {COVENANT_STATUS_LABELS[status]}
    </span>
  )
}
