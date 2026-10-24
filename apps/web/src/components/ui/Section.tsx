import type { ReactNode } from "react"
import styles from "./Section.module.css"

interface SectionProps {
  readonly title: string
  readonly meta?: ReactNode
  readonly children: ReactNode
}

export function Section({ title, meta, children }: SectionProps) {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {meta !== undefined && <div className={styles.meta}>{meta}</div>}
      </header>
      {children}
    </section>
  )
}
