import type { ReactNode } from "react"
import styles from "./StatusChip.module.css"

export type ChipTone = "breach" | "watch" | "pass" | "neutral"

interface StatusChipProps {
  readonly tone: ChipTone
  readonly children: ReactNode
}

/** A status as an outlined chip with a dot, the one way status is shown at the top of a card or row. */
export function StatusChip({ tone, children }: StatusChipProps) {
  return (
    <span className={styles.chip} data-tone={tone}>
      <span className={styles.dot} aria-hidden />
      {children}
    </span>
  )
}
