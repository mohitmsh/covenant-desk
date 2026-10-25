import type { Issue, IssueTone } from "@/types"
import { formatPeriod } from "./format"

/** Red for a discrepancy, amber otherwise, settled once decided. */
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

/** Button labels that say what each decision decides, rather than a generic accept or override. */
export const decisionLabels = (issue: Issue): { readonly confirm: string; readonly override: string } => {
  switch (issue.kind) {
    case "certificate_mismatch":
      return issue.severity === "high"
        ? { confirm: "Confirm breach", override: "Certificate is right (override)" }
        : { confirm: "Confirm tested figure", override: "Certificate is right (override)" }
    case "subtotal":
      return { confirm: "Confirm error in pack", override: "Pack is right (override)" }
    case "variance":
      return { confirm: "Mark as explained", override: "Not significant (override)" }
    case "period":
      return { confirm: "Confirm wrong period", override: "Period is right (override)" }
    case "conflict":
      return { confirm: "Confirm pages disagree", override: "Figures are consistent (override)" }
  }
}

/** Only decisions on how to read the pack are reapplied next month; covenant and certificate decisions are made afresh. */
export const canRemember = (issue: Issue): boolean => issue.category === "verify"
