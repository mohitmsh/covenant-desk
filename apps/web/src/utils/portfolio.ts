import { RUN_STATUS_LABELS } from "@/constants"
import type { PortfolioRow, Standing } from "@/types"
import { isRunInProgress } from "./runs"

/** The borrower's position in one word: its worst covenant, or where its run is. */
export const borrowerStanding = (row: PortfolioRow): Standing => {
  if (row.run === null) return { tone: "neutral", label: "No run yet" }
  if (isRunInProgress(row.run.status)) return { tone: "neutral", label: "Agent working" }
  if (row.covenants.some((c) => c.status === "breach")) return { tone: "breach", label: "Breach" }
  if (row.covenants.some((c) => c.status === "watch")) return { tone: "watch", label: "On watch" }
  return { tone: "pass", label: "All met" }
}

/** `2 open issues · awaiting sign-off`, or `approved`; null before any run. */
export const describeReview = (row: PortfolioRow): string | null => {
  if (row.run === null) return null
  const { openIssues, status } = row.run
  return [
    openIssues > 0 ? `${openIssues} open issue${openIssues === 1 ? "" : "s"}` : null,
    RUN_STATUS_LABELS[status].toLowerCase()
  ]
    .filter(Boolean)
    .join(" · ")
}
