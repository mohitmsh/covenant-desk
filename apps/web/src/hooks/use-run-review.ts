import { useRef, useState } from "react"
import { EMPTY_SOURCE_FOCUS } from "@/constants"
import type { Issue, IssueEvidence, RunDetail, SourceFocus, VerifiedCertificateClaim, VerifiedFigure } from "@/types"
import { nextOpenIssue } from "@/utils/issues"
import { claimKey } from "@/utils/overlays"

export type RunTab = "review" | "audit"

/**
 * What the run page is looking at: the document page and highlight, the
 * selected figure or claim, the issue being reviewed, and the open tab, with
 * the moves between them.
 */
export const useRunReview = ({ issues, figures, certificateClaims }: RunDetail) => {
  // Open the document where the most serious issue is, rather than on its cover.
  const [focus, setFocus] = useState<SourceFocus>(() => ({ ...EMPTY_SOURCE_FOCUS, page: issues[0]?.page ?? 1 }))
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [activeIssueKey, setActiveIssueKey] = useState<string | null>(null)
  const [tab, setTab] = useState<RunTab>("review")
  const signOffRef = useRef<HTMLDivElement>(null)

  const showPage = (page: number, box: SourceFocus["box"] = null) => setFocus({ ...EMPTY_SOURCE_FOCUS, page, box })

  const openIssue = (key: string) => {
    const issue = issues.find((i) => i.key === key)
    if (!issue) return
    setActiveIssueKey(key)
    setFocusedKey(null)
    showPage(issue.page)
  }

  const startReview = () => {
    const first = nextOpenIssue(issues, null) ?? issues[0]
    if (first) openIssue(first.key)
  }

  /** Moves to the next open issue, or on to sign-off once every issue is decided. */
  const advance = (decidedKey: string, updated: ReadonlyArray<Issue>) => {
    const next = nextOpenIssue(updated, decidedKey)
    if (next) {
      setActiveIssueKey(next.key)
      showPage(next.page)
    } else {
      setActiveIssueKey(null)
      signOffRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    }
  }

  const focusFigure = (figure: VerifiedFigure) => {
    setActiveIssueKey(null)
    setFocusedKey(figure.key)
    setFocus({ page: figure.page, quote: figure.quote, reported: figure.reported, box: figure.box })
  }

  const focusClaim = (claim: VerifiedCertificateClaim) => {
    setActiveIssueKey(null)
    setFocusedKey(claimKey(claim))
    setFocus({ page: claim.page, quote: claim.quote, reported: claim.reported, box: claim.box })
  }

  /** Selects a figure or claim from its outline on the document. */
  const selectField = (key: string) => {
    const figure = figures.find((f) => f.key === key)
    const claim = certificateClaims.find((c) => claimKey(c) === key)
    if (figure) focusFigure(figure)
    else if (claim) focusClaim(claim)
  }

  const changePage = (page: number) => {
    setFocusedKey(null)
    showPage(page)
  }

  const showEvidence = (evidence: IssueEvidence) => {
    if (evidence.page !== null) showPage(evidence.page, evidence.box)
  }

  return {
    focus,
    focusedKey,
    activeIssue: issues.find((issue) => issue.key === activeIssueKey) ?? null,
    activeIssueKey,
    tab,
    setTab,
    signOffRef,
    openIssue,
    closeIssue: () => setActiveIssueKey(null),
    startReview,
    advance,
    focusFigure,
    focusClaim,
    selectField,
    changePage,
    showEvidence
  }
}
