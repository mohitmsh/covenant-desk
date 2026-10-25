import { METRICS } from "@covenant-desk/core/constants"
import { FEATURED_BORROWER_ID, RUN_STATUS_LABELS } from "@/constants"
import type { Metric, Portfolio, PortfolioRow } from "@/types"
import { comparisonFor, disagreementLevel, type DisagreementLevel } from "@/utils/certificate"
import { formatCompactDollars, formatMetric, formatPeriod } from "@/utils/format"
import { isRunInProgress } from "@/utils/runs"
import { StatusChip, type ChipTone } from "@/components/ui/StatusChip"
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

/** ✕ the certificate reaches a different outcome, ≠ a different figure. */
const VERDICT_MARKS = { compliance: "✕", value: "≠", none: "" } as const satisfies Record<DisagreementLevel, string>

const shortName = (name: string) => name.replace(/\s+(Pty\.?\s*Ltd\.?|Limited|Ltd\.?)$/i, "")

/** The borrower's position in one word: its worst covenant, or where the run is. */
const standing = (row: PortfolioRow): { readonly tone: ChipTone; readonly label: string } => {
  if (row.run === null) return { tone: "neutral", label: "No run yet" }
  if (isRunInProgress(row.run.status)) return { tone: "neutral", label: "Agent working" }
  if (row.covenants.some((c) => c.status === "breach")) return { tone: "breach", label: "Breach" }
  if (row.covenants.some((c) => c.status === "watch")) return { tone: "watch", label: "On watch" }
  return { tone: "pass", label: "All met" }
}

/** `2 open issues · awaiting sign-off`, or `approved`. */
const reviewLine = (row: PortfolioRow) => {
  if (row.run === null) return null
  const parts = [
    row.run.openIssues > 0 ? `${row.run.openIssues} open issue${row.run.openIssues === 1 ? "" : "s"}` : null,
    RUN_STATUS_LABELS[row.run.status].toLowerCase()
  ]
  return parts.filter(Boolean).join(" · ")
}

function CovenantCell({ row, metric }: { readonly row: PortfolioRow; readonly metric: Metric }) {
  const result = row.covenants.find((c) => c.metric === metric)
  if (!result) return <span className={styles.empty}>–</span>
  const comparison = comparisonFor(row.certificateComparisons, metric)
  const level = comparison ? disagreementLevel(comparison) : "none"
  return (
    <span className={styles.covenant}>
      <span className={styles.covenantValue}>
        <StatusDot status={result.status} />
        {formatMetric(metric, result.actual)}
      </span>
      {comparison && level !== "none" && (
        <span className={styles.certificate}>
          cert {formatMetric(metric, comparison.certificateValue)}{" "}
          <span className={styles.verdict} data-level={level}>
            {VERDICT_MARKS[level]}
          </span>
        </span>
      )}
    </span>
  )
}

export function PortfolioView({ portfolio, onOpenRun }: PortfolioViewProps) {
  const { rows, totals } = portfolio
  const period = rows.find((row) => row.run !== null)?.run?.period

  const summary: ReadonlyArray<{
    readonly label: string
    readonly value: string
    readonly tone?: ChipTone | undefined
    readonly hint?: string
  }> = [
    { label: "Facility limits", value: formatCompactDollars(totals.facilityLimit) },
    { label: "Breaches", value: String(totals.breaches), tone: totals.breaches > 0 ? "breach" : undefined },
    { label: "On watch", value: String(totals.watches), tone: totals.watches > 0 ? "watch" : undefined },
    {
      label: "Certificate mismatches",
      value: String(totals.certificateMismatches),
      tone: totals.certificateMismatches > 0 ? "breach" : undefined,
      hint: "Covenants where the borrower's certificate contradicts the tested result"
    },
    {
      label: "Open issues",
      value: String(totals.openIssues),
      tone: totals.openIssues > 0 ? "watch" : undefined,
      hint: "Review issues that need a decision before sign-off"
    },
    { label: "Awaiting sign-off", value: String(totals.awaitingSignoff) }
  ]

  return (
    <div className={styles.scroll}>
      <div className={styles.content}>
        <header>
          <h1 className={styles.title}>Portfolio monitoring</h1>
          <p className={styles.subtitle}>
            {totals.facilities} facilities{period ? ` · ${formatPeriod(period)} reporting` : ""}
          </p>
        </header>

        <dl className={styles.summary}>
          {summary.map((item) => (
            <div key={item.label} className={styles.summaryItem} title={item.hint}>
              <dt>{item.label}</dt>
              <dd className="tabular" data-tone={item.tone}>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Status</th>
              {METRICS.map((metric) => (
                <th key={metric} className={styles.numericHead}>
                  {METRIC_HEADINGS[metric]}
                </th>
              ))}
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const runId = row.run?.id
              const { tone, label } = standing(row)
              return (
                <tr
                  key={row.borrower.id}
                  className={runId ? styles.clickable : undefined}
                  onClick={runId ? () => onOpenRun(runId) : undefined}
                >
                  <td>
                    <span className={styles.borrower}>
                      {shortName(row.borrower.name)}
                      {row.borrower.id === FEATURED_BORROWER_ID && <span className={styles.startHere}>Start here</span>}
                    </span>
                    <span className={styles.facility}>
                      {formatCompactDollars(row.borrower.facilityLimit)} · {row.borrower.analyst}
                    </span>
                  </td>
                  <td>
                    <StatusChip tone={tone}>{label}</StatusChip>
                  </td>
                  {METRICS.map((metric) => (
                    <td key={metric} className={styles.numeric}>
                      <CovenantCell row={row} metric={metric} />
                    </td>
                  ))}
                  <td className={styles.review} data-open={(row.run?.openIssues ?? 0) > 0}>
                    {reviewLine(row)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <p className={styles.legend}>
          Dots show each covenant's status. <span className={styles.verdict}>✕</span> the borrower's certificate reports
          a different outcome, <span className={styles.verdict}>≠</span> a different figure with the same outcome.
        </p>
      </div>
    </div>
  )
}
