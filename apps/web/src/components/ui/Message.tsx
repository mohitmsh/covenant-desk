import type { ReactNode } from "react"
import styles from "./Message.module.css"

interface MessageProps {
  readonly title: string
  readonly children?: ReactNode
  readonly tone?: "neutral" | "error"
}

/** Placeholder for loading, empty and error states. */
export function Message({ title, children, tone = "neutral" }: MessageProps) {
  return (
    <div className={styles.message} data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <p className={styles.title}>{title}</p>
      {children !== undefined && <p className={styles.body}>{children}</p>}
    </div>
  )
}
