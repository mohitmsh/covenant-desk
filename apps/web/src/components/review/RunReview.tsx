import { API_ROUTES, FEATURED_BORROWER_ID } from "@/constants"
import { useRunReview } from "@/hooks/use-run-review"
import type { RunDetail } from "@/types"
import { extractedFields, issueMarkers } from "@/utils/overlays"
import { isAwaitingAddBackDecision, isRunInProgress } from "@/utils/runs"
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
import { StartHere } from "./StartHere"
import styles from "./RunReview.module.css"

interface RunReviewProps {
  readonly detail: RunDetail
  readonly onOpenRun: (runId: string) => void
}

export function RunReview({ detail, onOpenRun }: RunReviewProps) {
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
  const review = useRunReview(detail)
  const { focus, focusedKey, activeIssue, activeIssueKey, tab, setTab, signOffRef } = review
  const showProgress = isRunInProgress(run.status) || run.status === "failed"
  const showIssues = run.status === "awaiting_signoff" || run.status === "approved"

  return (
    <div className={styles.review}>
      <div className={styles.scroll}>
        <div className={styles.content}>
          <RunHeader
            run={run}
            borrower={borrower}
            covenants={covenants}
            events={events}
            pendingAddBacks={isAwaitingAddBackDecision(detail)}
            onOpenRun={onOpenRun}
          />

          <div className={styles.tabs} role="tablist" aria-label="Run sections">
            <button type="button" role="tab" aria-selected={tab === "review"} onClick={() => setTab("review")}>
              Review
            </button>
            <button type="button" role="tab" aria-selected={tab === "audit"} onClick={() => setTab("audit")}>
              Audit trail <span className={styles.tabCount}>{events.length}</span>
            </button>
          </div>

          {tab === "review" ? (
            <>
              {showProgress && <AgentProgress status={run.status} events={events} />}

              {borrower.id === FEATURED_BORROWER_ID && run.status === "awaiting_signoff" && <StartHere />}

              <CertificateBanner
                comparisons={certificateComparisons}
                covenants={covenants}
                claims={certificateClaims}
                ebitdaGap={detail.ebitdaGap}
                onShowClaim={review.focusClaim}
              />

              {showIssues && (
                <IssuesPanel
                  issues={issues}
                  activeKey={activeIssueKey}
                  onStart={review.startReview}
                  onSelect={review.openIssue}
                />
              )}

              <Section title="Covenants">
                {covenants.length > 0 ? (
                  <CovenantTiles
                    covenants={covenants}
                    figures={figures}
                    claims={certificateClaims}
                    comparisons={certificateComparisons}
                    focusedKey={focusedKey}
                    onFocusFigure={review.focusFigure}
                    onFocusClaim={review.focusClaim}
                  />
                ) : (
                  <Message title="Not tested yet">Covenants are tested once every figure is verified.</Message>
                )}
              </Section>

              <Section title="Figures">
                {figures.length > 0 ? (
                  <FigureTable figures={figures} focusedFigure={focusedKey} onFocusFigure={review.focusFigure} />
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
                onShowPage={review.changePage}
              />

              <div ref={signOffRef}>
                <SignOff
                  key={run.id}
                  runId={run.id}
                  status={run.status}
                  note={note}
                  approval={approval}
                  analyst={borrower.analyst}
                  openIssues={issues.filter((issue) => issue.status === "open").length}
                  onReviewIssues={review.startReview}
                />
                <button type="button" className={styles.auditLink} onClick={() => setTab("audit")}>
                  View audit trail ({events.length} events)
                </button>
              </div>
            </>
          ) : (
            <Section title="Audit trail">
              <AuditTrail events={events} />
            </Section>
          )}
        </div>
      </div>

      <div className={styles.document}>
        <DocumentViewer
          url={API_ROUTES.runDocument(run.id)}
          document={document}
          focus={focus}
          onPageChange={review.changePage}
          markers={issueMarkers(issues, activeIssueKey)}
          onSelectMarker={review.openIssue}
          fields={extractedFields(figures, certificateClaims, focusedKey)}
          onSelectField={review.selectField}
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
                onSelect={review.openIssue}
                onShowEvidence={review.showEvidence}
                onDecided={review.advance}
                onClose={review.closeIssue}
              />
            )
          }
        />
      </div>
    </div>
  )
}
