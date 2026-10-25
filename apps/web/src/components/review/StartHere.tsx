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

/** Dismissible guide to reviewing the featured run. Dismissal is remembered in this browser. */
export function StartHere() {
  const [dismissed, setDismissed] = useState(readDismissed)
  if (dismissed) return null

  return (
    <aside className={styles.guide} aria-labelledby="start-here-heading">
      <div className={styles.header}>
        <h2 id="start-here-heading" className={styles.heading}>
          How to review this run
        </h2>
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
      <ol className={styles.steps}>
        <li>Click a page link (e.g. p. 6) to see the borrower's claim highlighted in the PDF.</li>
        <li>
          Click <strong>Start review</strong> to step through each issue and decide it against the document.
        </li>
        <li>Sign off once every issue is decided. Each step is recorded in the audit trail.</li>
      </ol>
    </aside>
  )
}
