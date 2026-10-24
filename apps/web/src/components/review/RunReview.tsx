import { useRef, useState } from "react"
import { API_ROUTES } from "@/constants"
import type { Issue, RunDetail, SourceFocus, VerifiedCertificateClaim, VerifiedFigure } from "@/types"
import { issueTone, nextOpenIssue } from "@/utils/issues"
import { isRunInProgress } from "@/utils/runs"
import { DocumentViewer } from "@/components/document/DocumentViewer"
import { Message } from "@/components/ui/Message"
import { Section } from "@/components/ui/Section"
import { AgentProgress } from "./AgentProgress"
import { AuditTrail } from "./AuditTrail"
import { CertificateBanner } from "./CertificateBanner"
import { CovenantTiles } from "./CovenantTiles"
import { FigureTable } from "./FigureTable"
import { IssueCard } from "./IssueCard"
import { IssuesPanel } from "./IssuesPanel"
import { MonitoringNote } from "./MonitoringNote"
import { RunHeader } from "./RunHeader"
import { SignOff } from "./SignOff"
import styles from "./RunReview.module.css"

interface RunReviewProps {
  readonly detail: RunDetail
}

const INITIAL_FOCUS: SourceFocus = { page: 1, quote: null, reported: null }

export function RunReview({ detail }: RunReviewProps) {
  const {
    run,
    borrower,
    document,
    figures,
    covenants,
    certificateClaims,
    certificateComparisons,
    issues,
    note,
    approval,
    events
  } = detail
  const [focus, setFocus] = useState<SourceFocus>(INITIAL_FOCUS)
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const [activeIssueKey, setActiveIssueKey] = useState<string | null>(null)
  const signOffRef = useRef<HTMLDivElement>(null)
  const showProgress = isRunInProgress(run.status) || run.status === "failed"
  const showIssues = run.status === "awaiting_signoff" || run.status === "approved"
  const activeIssue = issues.find((issue) => issue.key === activeIssueKey) ?? null

  const openIssue = (key: string) => {
    const issue = issues.find((i) => i.key === key)
    if (!issue) return
    setActiveIssueKey(key)
    setFocusedKey(null)
    setFocus({ page: issue.page, quote: null, reported: null })
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
      setFocus({ page: next.page, quote: null, reported: null })
    } else {
      setActiveIssueKey(null)
      signOffRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
    }
  }

  const focusFigure = (figure: VerifiedFigure) => {
    setActiveIssueKey(null)
    setFocusedKey(figure.key)
    setFocus({ page: figure.page, quote: figure.quote, reported: figure.reported })
  }

  const focusClaim = (claim: VerifiedCertificateClaim) => {
    setActiveIssueKey(null)
    setFocusedKey(`certificate:${claim.metric}`)
    setFocus({ page: claim.page, quote: claim.quote, reported: claim.reported })
  }

  const changePage = (page: number) => {
    setFocusedKey(null)
    setFocus({ page, quote: null, reported: null })
  }

  return (
    <div className={styles.review}>
      <div className={styles.scroll}>
        <div className={styles.content}>
          <RunHeader run={run} borrower={borrower} covenants={covenants} events={events} />

          {showProgress && <AgentProgress status={run.status} events={events} />}

          <CertificateBanner
            comparisons={certificateComparisons}
            covenants={covenants}
            claims={certificateClaims}
            onShowClaim={focusClaim}
          />

          {showIssues && (
            <IssuesPanel issues={issues} activeKey={activeIssueKey} onStart={startReview} onSelect={openIssue} />
          )}

          <Section title="Covenants">
            {covenants.length > 0 ? (
              <CovenantTiles
                covenants={covenants}
                figures={figures}
                claims={certificateClaims}
                comparisons={certificateComparisons}
                focusedKey={focusedKey}
                onFocusFigure={focusFigure}
                onFocusClaim={focusClaim}
              />
            ) : (
              <Message title="Not tested yet">Covenants are tested once every figure is verified.</Message>
            )}
          </Section>

          <Section title="Figures">
            {figures.length > 0 ? (
              <FigureTable figures={figures} focusedFigure={focusedKey} onFocusFigure={focusFigure} />
            ) : (
              <Message title="No figures yet">Figures appear as the agent verifies them.</Message>
            )}
          </Section>

          <MonitoringNote
            key={note?.version ?? 0}
            runId={run.id}
            note={note}
            author={borrower.analyst}
            editable={run.status === "awaiting_signoff"}
          />

          <div ref={signOffRef}>
            <SignOff
              key={run.id}
              runId={run.id}
              status={run.status}
              note={note}
              approval={approval}
              defaultApprover={borrower.analyst}
              openIssues={issues.filter((issue) => issue.status === "open").length}
              onReviewIssues={startReview}
            />
          </div>

          <Section title="Audit trail">
            <AuditTrail events={events} />
          </Section>
        </div>
      </div>

      <div className={styles.document}>
        <DocumentViewer
          url={API_ROUTES.runDocument(run.id)}
          document={document}
          focus={focus}
          onPageChange={changePage}
          markers={issues.flatMap((issue, index) =>
            issue.box
              ? [
                  {
                    key: issue.key,
                    page: issue.page,
                    number: index + 1,
                    label: issue.title,
                    box: issue.box,
                    tone: issueTone(issue),
                    active: issue.key === activeIssueKey
                  }
                ]
              : []
          )}
          onSelectMarker={openIssue}
          footer={
            activeIssue && (
              <IssueCard
                key={activeIssue.key}
                runId={run.id}
                issues={issues}
                issue={activeIssue}
                editable={run.status === "awaiting_signoff"}
                actor={borrower.analyst}
                borrowerName={borrower.name}
                period={run.period}
                onSelect={openIssue}
                onDecided={advance}
                onClose={() => setActiveIssueKey(null)}
              />
            )
          }
        />
      </div>
    </div>
  )
}
