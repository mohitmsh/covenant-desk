import type { CovenantStatus } from "@/types"
import styles from "./StatusDot.module.css"

interface StatusDotProps {
  readonly status: CovenantStatus | "neutral"
}

export function StatusDot({ status }: StatusDotProps) {
  return <span className={styles.dot} data-status={status} aria-hidden />
}
