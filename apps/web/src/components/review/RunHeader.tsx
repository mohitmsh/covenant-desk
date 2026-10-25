import { COVENANT_STATUS_LABELS, RUN_STATUS_LABELS, RUN_STATUS_PILL_TONES } from "@/constants"
import { useStartAgentRun } from "@/hooks/use-runs"
import type { AuditEvent, Borrower, CovenantResult, RunSummary } from "@/types"
import { formatRunSource } from "@/utils/actors"
import { worstStatus } from "@/utils/covenants"
import { agentUsage } from "@/utils/runs"
import { formatCompactDollars, formatPeriod, formatRecentTime, formatUsd } from "@/utils/format"
import { Avatar } from "@/components/ui/Avatar"
import { Pill } from "@/components/ui/Pill"
import { StatusChip } from "@/components/ui/StatusChip"
import styles from "./RunHeader.module.css"

interface RunHeaderProps {
  readonly run: RunSummary
  readonly borrower: Borrower
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly events: ReadonlyArray<AuditEvent>
  /** The breach rests on add-backs the analyst has not yet decided on. */
  readonly pendingAddBacks: boolean
  readonly onOpenRun: (runId: string) => void
}

export function RunHeader({ run, borrower, covenants, events, pendingAddBacks, onOpenRun }: RunHeaderProps) {
  const outcome = worstStatus(covenants)
  const usage = agentUsage(events)
  const rerun = useStartAgentRun()

  return (
    <header className={styles.header}>
      <div className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>{formatPeriod(run.period)} monitoring run</p>
          <h1 className={styles.title}>{borrower.name}</h1>
          <p className={styles.subtitle}>
            {borrower.facilityName} · {formatCompactDollars(borrower.facilityLimit)}
          </p>
        </div>
        <Pill tone={RUN_STATUS_PILL_TONES[run.status]}>{RUN_STATUS_LABELS[run.status]}</Pill>
      </div>
      <dl className={styles.facts}>
        <dt>Analyst</dt>
        <dd className={styles.analyst}>
          <Avatar name={borrower.analyst} />
          {borrower.analyst}
        </dd>

        {outcome !== null && (
          <>
            <dt>Outcome</dt>
            <dd>
              <span className={styles.outcome}>
                <StatusChip tone={outcome}>{COVENANT_STATUS_LABELS[outcome]}</StatusChip>
                {pendingAddBacks && outcome === "breach" && (
                  <span className={styles.secondary}>pending add-back decision</span>
                )}
              </span>
            </dd>
          </>
        )}

        <dt>{usage ? "Agent run" : "Started by"}</dt>
        <dd title={run.startedBy}>
          <span className="tabular">
            {formatRunSource(run.startedBy).replace(/^Agent · /, "")}
            {usage && (
              <span className={styles.secondary}>
                {" "}
                · {formatUsd(usage.costUsd)} · {usage.toolCalls} tool calls · {Math.round(usage.modelSeconds)}s
              </span>
            )}
          </span>
          {usage?.recordedAt && (
            <span
              className={styles.recorded}
              title="The model's responses were recorded from a real run and replayed through the current code"
            >
              Replay of a run recorded {formatRecentTime(usage.recordedAt)} ·{" "}
              <button
                type="button"
                className={styles.rerun}
                disabled={rerun.isPending}
                onClick={() =>
                  rerun.mutate({ borrowerId: borrower.id, file: null }, { onSuccess: ({ runId }) => onOpenRun(runId) })
                }
              >
                {rerun.isPending ? "Starting…" : "Re-run live"}
              </button>
            </span>
          )}
          {rerun.isError && <span className={styles.rerunError}>{rerun.error.message}</span>}
        </dd>
      </dl>
    </header>
  )
}
