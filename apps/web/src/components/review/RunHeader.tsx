import { RUN_STATUS_LABELS } from "@/constants"
import type { AuditEvent, Borrower, CovenantResult, RunStatus, RunSummary } from "@/types"
import { formatRunSource } from "@/utils/actors"
import { worstStatus } from "@/utils/covenants"
import { agentCostUsd, formatUsd } from "@/utils/runs"
import { formatCompactDollars, formatPeriod } from "@/utils/format"
import { Avatar } from "@/components/ui/Avatar"
import { Pill, type PillTone } from "@/components/ui/Pill"
import { StatusBadge } from "@/components/ui/StatusBadge"
import styles from "./RunHeader.module.css"

const STATUS_TONES = {
  extracting: "neutral",
  tested: "neutral",
  awaiting_signoff: "accent",
  approved: "positive",
  failed: "negative"
} as const satisfies Record<RunStatus, PillTone>

interface RunHeaderProps {
  readonly run: RunSummary
  readonly borrower: Borrower
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly events: ReadonlyArray<AuditEvent>
}

export function RunHeader({ run, borrower, covenants, events }: RunHeaderProps) {
  const outcome = worstStatus(covenants)
  const cost = agentCostUsd(events)

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
        <Pill tone={STATUS_TONES[run.status]}>{RUN_STATUS_LABELS[run.status]}</Pill>
      </div>
      <dl className={styles.facts}>
        <div>
          <dt>Analyst</dt>
          <dd className={styles.analyst}>
            <Avatar name={borrower.analyst} />
            {borrower.analyst}
          </dd>
        </div>
        {outcome !== null && (
          <div>
            <dt>Outcome</dt>
            <dd>
              <StatusBadge status={outcome} />
            </dd>
          </div>
        )}
        <div>
          <dt>Started by</dt>
          <dd title={run.startedBy}>{formatRunSource(run.startedBy)}</dd>
        </div>
        {cost !== null && (
          <div>
            <dt>Model cost</dt>
            <dd className="tabular">{formatUsd(cost)}</dd>
          </div>
        )}
      </dl>
    </header>
  )
}
