import { useState } from "react"
import { START_HERE_DISMISSED_KEY } from "@/constants"
import { Button } from "@/components/ui/Button"
import styles from "./StartHere.module.css"

const readDismissed = () => {
  try {
    return window.localStorage.getItem(START_HERE_DISMISSED_KEY) === "true"
  } catch {
    return false
  }
}

const saveDismissed = () => {
  try {
    window.localStorage.setItem(START_HERE_DISMISSED_KEY, "true")
  } catch {
    // Storage can be unavailable, e.g. in a private window; the guide just shows again next time.
  }
}

/** First-visit guide to the featured run's story. */
export function StartHere() {
  const [dismissed, setDismissed] = useState(readDismissed)
  if (dismissed) return null

  return (
    <aside className={styles.guide} aria-label="Start here">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Start here</p>
        <Button
          variant="ghost"
          aria-label="Dismiss guide"
          onClick={() => {
            saveDismissed()
            setDismissed(true)
          }}
        >
          ✕
        </Button>
      </div>
      <p className={styles.lead}>
        The borrower certifies that every covenant complies. The agent's verified figures say net leverage is in breach.
      </p>
      <ol className={styles.steps}>
        <li>In the red banner, click a page link to see the borrower's own claim highlighted in the PDF.</li>
        <li>
          Click <strong>Start review</strong> to step through the issues the checks found, deciding each one on the
          document.
        </li>
        <li>Sign off at the bottom once every issue is decided. Every step lands in the audit trail.</li>
      </ol>
    </aside>
  )
}
