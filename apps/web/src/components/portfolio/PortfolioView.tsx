import { METRICS } from "@covenant-desk/core/constants"
import { FEATURED_BORROWER_ID, RUN_STATUS_LABELS } from "@/constants"
import type { Metric, Portfolio, PortfolioRow } from "@/types"
import { comparisonFor, describeCertificateClaim, disagreementLevel, hasDisagreement } from "@/utils/certificate"
import { formatCompactDollars, formatMetric, formatPeriod } from "@/utils/format"
import { isRunInProgress } from "@/utils/runs"
import { Avatar } from "@/components/ui/Avatar"
import { StatTile } from "@/components/ui/StatTile"
import { StatusDot } from "@/components/ui/StatusDot"
import styles from "./PortfolioView.module.css"

interface PortfolioViewProps {
  readonly portfolio: Portfolio
  readonly onOpenRun: (runId: string) => void
}

const METRIC_HEADINGS = {
  net_leverage: "Net leverage",
  interest_cover: "Interest cover",
  minimum_liquidity: "Liquidity"
} as const satisfies Record<Metric, string>

const monitoringLabel = (row: PortfolioRow) => {
  if (row.run === null) return { label: "No run yet", tone: "neutral" as const }
  if (isRunInProgress(row.run.status)) return { label: "Agent working…", tone: "watch" as const }
  return {
    label: RUN_STATUS_LABELS[row.run.status],
    tone: row.run.status === "approved" ? ("pass" as const) : ("neutral" as const)
  }
}

function CovenantCell({ row, metric }: { readonly row: PortfolioRow; readonly metric: Metric }) {
  const result = row.covenants.find((c) => c.metric === metric)
  if (!result) return <span className={styles.empty}>–</span>
  const comparison = comparisonFor(row.certificateComparisons, metric)
  return (
    <span className={styles.covenant}>
      <span className={styles.covenantValue}>
        <StatusDot status={result.status} />
        {formatMetric(metric, result.actual)}
      </span>
      {comparison && hasDisagreement(comparison) && (
        <span className={styles.mismatch} data-level={disagreementLevel(comparison)}>
          Certificate: {describeCertificateClaim(comparison)}
        </span>
      )}
    </span>
  )
}

export function PortfolioView({ portfolio, onOpenRun }: PortfolioViewProps) {
  const { rows, totals } = portfolio
  const period = rows.find((row) => row.run !== null)?.run?.period

  return (
    <div className={styles.scroll}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Portfolio monitoring</h1>
            <p className={styles.subtitle}>
              {totals.facilities} facilities{period ? ` · ${formatPeriod(period)} reporting` : ""}
            </p>
          </div>
        </header>

        <div className={styles.stats}>
          <StatTile label="Facility limits" value={formatCompactDollars(totals.facilityLimit)} />
          <StatTile
            label="Covenant breaches"
            value={totals.breaches}
            tone={totals.breaches > 0 ? "breach" : "neutral"}
          />
          <StatTile label="On watch" value={totals.watches} tone={totals.watches > 0 ? "watch" : "neutral"} />
          <StatTile
            label="Certificate mismatches"
            value={totals.certificateMismatches}
            tone={totals.certificateMismatches > 0 ? "breach" : "neutral"}
            detail="Borrower-reported results the tests contradict"
          />
          <StatTile
            label="Open review issues"
            value={totals.openIssues}
            tone={totals.openIssues > 0 ? "watch" : "neutral"}
            detail="Decisions needed before sign-off"
          />
          <StatTile label="Awaiting sign-off" value={totals.awaitingSignoff} />
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Analyst</th>
              <th>Monitoring</th>
              {METRICS.map((metric) => (
                <th key={metric}>{METRIC_HEADINGS[metric]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const monitoring = monitoringLabel(row)
              const runId = row.run?.id
              return (
                <tr
                  key={row.borrower.id}
                  className={runId ? styles.clickable : undefined}
                  onClick={runId ? () => onOpenRun(runId) : undefined}
                >
                  <td>
                    <span className={styles.borrower}>
                      {row.borrower.name}
                      {row.borrower.id === FEATURED_BORROWER_ID && <span className={styles.startHere}>Start here</span>}
                    </span>
                    <span className={styles.facility}>{formatCompactDollars(row.borrower.facilityLimit)} facility</span>
                  </td>
                  <td>
                    <Avatar name={row.borrower.analyst} />
                  </td>
                  <td>
                    <span className={styles.monitoringCell}>
                      <span className={styles.monitoring}>
                        <StatusDot status={monitoring.tone === "neutral" ? "neutral" : monitoring.tone} />
                        {monitoring.label}
                      </span>
                      {row.run !== null && row.run.openIssues > 0 && (
                        <span className={styles.issues}>
                          {row.run.openIssues} open issue{row.run.openIssues === 1 ? "" : "s"}
                        </span>
                      )}
                    </span>
                  </td>
                  {METRICS.map((metric) => (
                    <td key={metric}>
                      <CovenantCell row={row} metric={metric} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
