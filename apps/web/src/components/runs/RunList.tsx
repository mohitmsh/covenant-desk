import { RUN_STATUS_LABELS } from "@/constants"
import type { RunSummary } from "@/types"
import { formatRunOrigin } from "@/utils/actors"
import { formatPeriod } from "@/utils/format"
import { StatusDot } from "@/components/ui/StatusDot"
import { Button } from "@/components/ui/Button"
import { Message } from "@/components/ui/Message"
import { isRunInProgress } from "@/utils/runs"
import styles from "./RunList.module.css"

interface RunListProps {
  readonly runs: ReadonlyArray<RunSummary>
  readonly selectedRunId: string | null
  readonly onSelect: (runId: string) => void
  readonly onNewRun: () => void
  readonly isPortfolioOpen: boolean
  readonly onOpenPortfolio: () => void
}

const runOutcome = (run: RunSummary) => {
  if (isRunInProgress(run.status) || run.status === "failed") return "neutral"
  return run.breaches > 0 ? "breach" : run.watches > 0 ? "watch" : "pass"
}

const outcomeLabel = (run: RunSummary) => {
  if (isRunInProgress(run.status)) return "Agent working…"
  if (run.status === "failed") return "Run failed"
  if (run.breaches > 0) return `${run.breaches} breach${run.breaches > 1 ? "es" : ""}`
  if (run.watches > 0) return `${run.watches} on watch`
  return "All covenants met"
}

export function RunList({ runs, selectedRunId, onSelect, onNewRun, isPortfolioOpen, onOpenPortfolio }: RunListProps) {
  const pending = runs.filter((run) => run.status !== "approved")
  const approved = runs.filter((run) => run.status === "approved")

  const newRunButton = (
    <>
      <div className={styles.nav}>
        <button type="button" className={styles.navItem} aria-current={isPortfolioOpen} onClick={onOpenPortfolio}>
          Portfolio
        </button>
      </div>
      <div className={styles.actions}>
        <span className={styles.actionsTitle}>Monitoring runs</span>
        <Button variant="primary" onClick={onNewRun}>
          New run
        </Button>
      </div>
    </>
  )

  if (runs.length === 0) {
    return (
      <>
        {newRunButton}
        <Message title="No runs yet">Start a run to have the agent review a reporting pack.</Message>
      </>
    )
  }

  const renderGroup = (title: string, group: ReadonlyArray<RunSummary>) =>
    group.length > 0 && (
      <div className={styles.group}>
        <h3 className={styles.groupTitle}>
          {title}
          <span className={styles.count}>{group.length}</span>
        </h3>
        <ul className={styles.list}>
          {group.map((run) => (
            <li key={run.id}>
              <button
                type="button"
                className={styles.item}
                aria-current={run.id === selectedRunId}
                onClick={() => onSelect(run.id)}
              >
                <span className={styles.name}>{run.borrowerName}</span>
                <span className={styles.source}>
                  {formatRunOrigin(run.startedBy, run.createdAt)}
                  {run.openIssues > 0 && (
                    <span className={styles.issues}>
                      {" "}
                      · {run.openIssues} issue{run.openIssues === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
                <span className={styles.meta}>
                  <StatusDot status={runOutcome(run)} />
                  {outcomeLabel(run)}
                  <span className={styles.period}>{formatPeriod(run.period)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )

  return (
    <nav aria-label="Monitoring runs">
      {newRunButton}
      {renderGroup(RUN_STATUS_LABELS.awaiting_signoff, pending)}
      {renderGroup(RUN_STATUS_LABELS.approved, approved)}
    </nav>
  )
}
