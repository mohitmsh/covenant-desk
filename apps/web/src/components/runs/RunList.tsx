import { RUN_STATUS_LABELS } from "@/constants"
import type { RunSummary } from "@/types"
import { formatRunOrigin } from "@/utils/actors"
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
  readonly isEvalsOpen: boolean
  readonly onOpenEvals: () => void
}

/** Drops the company suffix, which every borrower shares: `Corella Fresh Foods Pty Ltd` → `Corella Fresh Foods`. */
const shortName = (name: string) => name.replace(/\s+(Pty\.?\s*Ltd\.?|Limited|Ltd\.?)$/i, "")

/** `2026-09` → `Sep 2026`. */
const formatShortPeriod = (period: string) =>
  new Date(`${period}-01T00:00:00Z`)
    .toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" })
    .replace("Sept", "Sep")

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

export function RunList({
  runs,
  selectedRunId,
  onSelect,
  onNewRun,
  isPortfolioOpen,
  onOpenPortfolio,
  isEvalsOpen,
  onOpenEvals
}: RunListProps) {
  // Runs arrive newest first, so the first per borrower and period is current and the rest are superseded.
  const seen = new Set<string>()
  const superseded = new Set<string>()
  for (const run of runs) {
    const slot = `${run.borrowerId}/${run.period}`
    if (seen.has(slot) && run.status !== "failed") superseded.add(run.id)
    if (run.status !== "failed") seen.add(slot)
  }
  const current = runs.filter((run) => !superseded.has(run.id))
  const pending = current.filter((run) => run.status !== "approved")
  const approved = current.filter((run) => run.status === "approved")
  const older = runs.filter((run) => superseded.has(run.id))

  const newRunButton = (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Workspace</h2>
        <button type="button" className={styles.navItem} aria-current={isPortfolioOpen} onClick={onOpenPortfolio}>
          <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          Portfolio
        </button>
        <button type="button" className={styles.navItem} aria-current={isEvalsOpen} onClick={onOpenEvals}>
          <svg className={styles.navIcon} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <circle cx="8" cy="8" r="6" />
            <path d="M5.5 8.2 7.2 9.8 10.6 6.3" />
          </svg>
          Test results
        </button>
      </div>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Monitoring runs</h2>
        <Button variant="primary" className={styles.newRun} onClick={onNewRun}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
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
                title={`${run.borrowerName} · ${formatRunOrigin(run.startedBy, run.createdAt)}`}
                onClick={() => onSelect(run.id)}
              >
                <span className={styles.nameRow}>
                  <span className={styles.name}>{shortName(run.borrowerName)}</span>
                  {run.openIssues > 0 && (
                    <span className={styles.issueCount} aria-label={`${run.openIssues} open issues`}>
                      {run.openIssues}
                    </span>
                  )}
                </span>
                <span className={styles.meta}>
                  <StatusDot status={runOutcome(run)} />
                  {outcomeLabel(run)}
                  <span className={styles.period}>{formatShortPeriod(run.period)}</span>
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
      {renderGroup("Superseded by a later run", older)}
    </nav>
  )
}
