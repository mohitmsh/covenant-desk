import type { ReactNode } from "react"
import styles from "./StatTile.module.css"

interface StatTileProps {
  readonly label: string
  readonly value: ReactNode
  readonly detail?: ReactNode
  readonly tone?: "neutral" | "breach" | "watch"
}

/** A labelled headline number. */
export function StatTile({ label, value, detail, tone = "neutral" }: StatTileProps) {
  return (
    <div className={styles.tile} data-tone={tone}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {detail !== undefined && <span className={styles.detail}>{detail}</span>}
    </div>
  )
}
