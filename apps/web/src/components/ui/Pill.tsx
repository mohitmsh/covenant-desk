import type { ReactNode } from "react"
import styles from "./Pill.module.css"

export type PillTone = "neutral" | "accent" | "positive" | "negative"

interface PillProps {
  readonly tone: PillTone
  readonly children: ReactNode
}

export function Pill({ tone, children }: PillProps) {
  return (
    <span className={styles.pill} data-tone={tone}>
      {children}
    </span>
  )
}
