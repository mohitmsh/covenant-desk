import {
  AVERAGE_MONTH_MS,
  VARIANCE_CHECKS,
  VARIANCE_COLUMNS,
  VARIANCE_LINES,
  VARIANCE_METRICS,
  VARIANCE_THRESHOLD
} from "#constants/issues"
import type { CovenantResult } from "#types/covenants"
import type { IssueFinding, PeriodComparison } from "#types/issues"
import type { TableRow } from "#types/pdf"
import { describeImpact, formatMillionsAmount, formatThousandsAmount, inThousands, sameLabel } from "#utils/issue-text"

const isDateColumn = (column: string | null): column is string => column !== null && !Number.isNaN(Date.parse(column))

/** `prior month`, `prior quarter` or `prior year`, from how far apart two dated columns are. */
const priorPeriodWord = (current: string, prior: string): string => {
  const months = Math.round((Date.parse(current) - Date.parse(prior)) / AVERAGE_MONTH_MS)
  return months === 1
    ? "prior month"
    : months === 3
      ? "prior quarter"
      : months === 12
        ? "prior year"
        : `${months} months earlier`
}

/** The current and prior cells of a row: a named column pair, or the two latest dated columns. */
const currentAndPrior = (row: TableRow): PeriodComparison | null => {
  for (const [current, prior] of VARIANCE_COLUMNS) {
    const a = row.cells.find((c) => c.column === current)
    const b = row.cells.find((c) => c.column === prior)
    if (a && b) return { current: a, prior: b, priorWord: "prior year" }
  }
  const dated = row.cells
    .filter((c) => isDateColumn(c.column))
    .sort((a, b) => Date.parse(b.column ?? "") - Date.parse(a.column ?? ""))
  const [latest, previous] = dated
  return latest && previous
    ? { current: latest, prior: previous, priorWord: priorPeriodWord(latest.column ?? "", previous.column ?? "") }
    : null
}

/** Lines that moved by more than the threshold against the prior period. */
export const varianceFindings = (
  rows: ReadonlyArray<TableRow>,
  page: number,
  covenants: ReadonlyArray<CovenantResult>
): IssueFinding[] =>
  VARIANCE_LINES.flatMap((line) => {
    const row = rows.find((r) => sameLabel(r.label, line))
    const pair = row ? currentAndPrior(row) : null
    if (!row || !pair) return []
    const { current, prior, priorWord } = pair
    if (prior.value === 0) return []
    const change = (Math.abs(current.value) - Math.abs(prior.value)) / Math.abs(prior.value)
    if (Math.abs(change) <= VARIANCE_THRESHOLD) return []
    const percent = Math.round(Math.abs(change) * 100)
    return [
      {
        key: `variance:p${page}:${line}`,
        fingerprint: `variance:${line}`,
        kind: "variance",
        category: "explanation",
        severity: "medium",
        title: `${line} ${change > 0 ? "up" : "down"} ${percent}% on the ${priorWord} (${formatMillionsAmount(inThousands(row, prior.value))} → ${formatMillionsAmount(inThousands(row, current.value))})`,
        detail:
          `${formatThousandsAmount(inThousands(row, Math.abs(current.value)))} (${current.column}) against ` +
          `${formatThousandsAmount(inThousands(row, Math.abs(prior.value)))} ` +
          `(${prior.column}). The figures are consistent, but changes of more than ` +
          `${Math.round(VARIANCE_THRESHOLD * 100)}% need an explanation.`,
        page,
        box: row.box,
        evidence: [
          {
            label: prior.column ?? "Prior period",
            value: formatThousandsAmount(inThousands(row, Math.abs(prior.value))),
            page,
            box: prior.box
          },
          {
            label: current.column ?? "Current period",
            value: formatThousandsAmount(inThousands(row, Math.abs(current.value))),
            page,
            box: current.box
          }
        ],
        impact:
          describeImpact(VARIANCE_METRICS[line], covenants) ??
          "Does not feed a covenant directly, but may signal pressure on working capital or trading.",
        checks: [...VARIANCE_CHECKS[line]]
      }
    ]
  })
