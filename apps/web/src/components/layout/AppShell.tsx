import type { ReactNode } from "react"
import { BrandMark } from "@/components/ui/BrandMark"
import styles from "./AppShell.module.css"

interface AppShellProps {
  readonly sidebar: ReactNode
  readonly children: ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <BrandMark />
        <span className={styles.environment}>Prototype · fictional borrowers</span>
      </header>
      <aside className={styles.sidebar}>{sidebar}</aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
