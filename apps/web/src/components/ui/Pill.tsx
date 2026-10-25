import type { ReactNode } from "react"
import type { PillTone } from "@/types"
import styles from "./Pill.module.css"

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
