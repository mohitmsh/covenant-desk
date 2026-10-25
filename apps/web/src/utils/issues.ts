import type { Issue } from "@/types"
import { formatPeriod } from "./format"

/** Colour an issue is drawn in: red for a discrepancy, amber otherwise, settled once decided. */
export type IssueTone = "breach" | "watch" | "decided"

export const issueTone = (issue: Issue): IssueTone =>
  issue.status !== "open" ? "decided" : issue.category === "discrepancy" ? "breach" : "watch"

export const countOpen = (issues: ReadonlyArray<Issue>): number => issues.filter((i) => i.status === "open").length

/** The next open issue after `fromKey`, wrapping round; null when none are open. */
export const nextOpenIssue = (issues: ReadonlyArray<Issue>, fromKey: string | null): Issue | null => {
  const start = issues.findIndex((issue) => issue.key === fromKey)
  for (let step = 1; step <= issues.length; step++) {
    const issue = issues[(start + step + issues.length) % issues.length]
    if (issue?.status === "open") return issue
  }
  return null
}

/** Starting text for a query to the borrower about an issue, for the analyst to edit. */
export const draftQuery = (issue: Issue, borrowerName: string, period: string): string =>
  `Re: ${borrowerName}, ${formatPeriod(period)} reporting pack, page ${issue.page}

${issue.title}. ${issue.detail}

Could you please confirm the correct figures, or explain the difference, and reissue the page if needed?`
