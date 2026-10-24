import { useState } from "react"
import { API_ROUTES } from "@/constants"
import type { RunDetail, SourceFocus, VerifiedCertificateClaim, VerifiedFigure } from "@/types"
import { isRunInProgress } from "@/utils/runs"
import { DocumentViewer } from "@/components/document/DocumentViewer"
import { Message } from "@/components/ui/Message"
import { Section } from "@/components/ui/Section"
import { AgentProgress } from "./AgentProgress"
import { AuditTrail } from "./AuditTrail"
import { CertificateBanner } from "./CertificateBanner"
import { CovenantTiles } from "./CovenantTiles"
import { FigureTable } from "./FigureTable"
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
    note,
    approval,
    events
  } = detail
  const [focus, setFocus] = useState<SourceFocus>(INITIAL_FOCUS)
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const showProgress = isRunInProgress(run.status) || run.status === "failed"

  const focusFigure = (figure: VerifiedFigure) => {
    setFocusedKey(figure.key)
    setFocus({ page: figure.page, quote: figure.quote, reported: figure.reported })
  }

  const focusClaim = (claim: VerifiedCertificateClaim) => {
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

          <SignOff
            key={run.id}
            runId={run.id}
            status={run.status}
            note={note}
            approval={approval}
            defaultApprover={borrower.analyst}
          />

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
        />
      </div>
    </div>
  )
}
