import { Effect } from "effect"
import {
  CERTIFICATE_CHECKS,
  PERIOD_CHECKS,
  SUBTOTAL_CHECKS,
  SUBTOTAL_RULES,
  SUBTOTAL_TOLERANCE,
  VARIANCE_CHECKS,
  VARIANCE_COLUMNS,
  VARIANCE_LINES,
  VARIANCE_METRICS,
  VARIANCE_THRESHOLD
} from "#constants/issues"
import { listCertificateClaims } from "#repositories/certificate-claims"
import { getCovenantResults } from "#repositories/covenant-results"
import { recordIssues } from "#repositories/issues"
import { getRunSummary } from "#repositories/runs"
import { compareCertificates } from "#services/certificate"
import type { VerifiedCertificateClaim } from "#types/certificate"
import type { CovenantResult, Metric } from "#types/covenants"
import type { RunId } from "#types/ids"
import type { IssueFinding } from "#types/issues"
import type { PdfText } from "#types/pdf"
import { formatMetricValue } from "#utils/format"
import { locateQuote, readTableRows, type TableCell, type TableRow } from "#utils/layout"
import { canonicalText } from "#utils/text"

export interface CheckInput {
  readonly pdf: PdfText
  /** `YYYY-MM` period the run tests. */
  readonly period: string
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
}

const sameLabel = (a: string, b: string) => canonicalText(a) === canonicalText(b)

/** Formats an amount printed in $'000, e.g. `$1,540k` or `−$1,253k`. */
const thousands = (value: number) => `${value < 0 ? "−" : ""}$${Math.round(Math.abs(value)).toLocaleString("en-AU")}k`

const complianceWord = (complies: boolean) => (complies ? "complies" : "does not comply")

const LIMIT_WORDS = { lte: "maximum", gte: "minimum" } as const

/** A covenant value as an analyst would say it: `4.06x` or `$1.54m`. */
const spokenValue = (metric: Metric, value: number) =>
  metric === "minimum_liquidity" ? `$${(value / 1_000_000).toFixed(2)}m` : formatMetricValue(metric, value)

/** `Minimum liquidity $1.54m against a $1.50m minimum (2.7% headroom, watch)`. */
const describeCovenant = (result: CovenantResult) =>
  `${result.name} ${spokenValue(result.metric, result.actual)} against a ` +
  `${spokenValue(result.metric, result.limit)} ${LIMIT_WORDS[result.operator]} ` +
  `(${(result.headroom * 100).toFixed(1)}% headroom${result.status === "pass" ? "" : `, ${result.status}`})`

const impactOn = (metrics: ReadonlyArray<Metric>, covenants: ReadonlyArray<CovenantResult>): string | null => {
  const affected = covenants.filter((c) => metrics.includes(c.metric))
  if (affected.length === 0) return null
  return `Feeds ${affected.length === 1 ? "a covenant" : `${affected.length} covenants`}: ${affected
    .map(describeCovenant)
    .join("; ")}.`
}

const certificateFindings = ({ covenants, claims }: CheckInput): IssueFinding[] =>
  compareCertificates(covenants, claims).flatMap((comparison) => {
    if (comparison.disagreements.length === 0) return []
    const claim = claims.find((c) => c.metric === comparison.metric)
    const covenant = covenants.find((c) => c.metric === comparison.metric)
    if (!claim || !covenant) return []
    const name = covenant.name.toLowerCase()
    const compliance = comparison.disagreements.includes("compliance")
    const certificateValue = formatMetricValue(comparison.metric, comparison.certificateValue)
    const testedValue = formatMetricValue(comparison.metric, comparison.testedValue)
    return [
      {
        key: `certificate:${comparison.metric}`,
        fingerprint: `certificate:${comparison.metric}:${comparison.disagreements.join("+")}`,
        kind: "certificate_mismatch",
        category: "discrepancy",
        severity: compliance ? "high" : "medium",
        title: compliance
          ? `Certificate says ${name} complies; tested result is a breach`
          : `Certificate reports a different ${name}`,
        detail:
          `The certificate states ${certificateValue} (${complianceWord(comparison.claimsCompliance)}). ` +
          `Tested from the verified figures: ${testedValue} (${comparison.testedStatus}).`,
        page: claim.page,
        box: claim.box,
        evidence: [
          {
            label: "Borrower's certificate",
            value: `${certificateValue} · ${complianceWord(comparison.claimsCompliance)}`,
            page: claim.page,
            box: claim.box
          },
          {
            label: "Tested from verified figures",
            value: `${testedValue} · ${comparison.testedStatus}`,
            page: null,
            box: null
          }
        ],
        impact: compliance
          ? `The certificate does not disclose a covenant breach, which may itself be a default under the facility. ${describeCovenant(covenant)}.`
          : "Both reach the same outcome, so compliance does not change. A different figure usually means the certificate used a different EBITDA or definition.",
        checks: [...CERTIFICATE_CHECKS]
      }
    ]
  })

/** The part cell in the same column as `cell`, by header when both have one, otherwise by position. */
const cellInColumn = (row: TableRow, cell: TableCell, index: number): TableCell | undefined =>
  cell.column !== null && row.cells.some((c) => c.column !== null)
    ? row.cells.find((c) => c.column === cell.column)
    : row.cells[index]

/** `revenue + cost of sales` for short rules; longer ones read as the lines they total. */
const partsFormula = (parts: ReadonlyArray<readonly [string, 1 | -1]>) =>
  parts.length > 2
    ? "its lines"
    : parts
        .map(([label, sign], index) => `${index === 0 ? "" : sign > 0 ? " + " : " − "}${label.toLowerCase()}`)
        .join("")

const subtotalFindings = (rows: ReadonlyArray<TableRow>, page: number): IssueFinding[] =>
  SUBTOTAL_RULES.flatMap((rule) => {
    const total = rows.find((row) => sameLabel(row.label, rule.total))
    const parts = rule.parts.map(([label, sign]) => ({ row: rows.find((row) => sameLabel(row.label, label)), sign }))
    if (!total || parts.some((part) => part.row === undefined)) return []

    const mismatches = total.cells.flatMap((cell, index) => {
      const cells = parts.map((part) => (part.row ? cellInColumn(part.row, cell, index) : undefined))
      if (cells.some((c) => c === undefined)) return []
      const sum = cells.reduce((acc, c, i) => acc + (c?.value ?? 0) * (parts[i]?.sign ?? 1), 0)
      const difference = cell.value - sum
      return Math.abs(difference) > SUBTOTAL_TOLERANCE ? [{ cell, sum, difference }] : []
    })
    if (mismatches.length === 0) return []

    return [
      {
        key: `subtotal:p${page}:${rule.total}`,
        fingerprint: `subtotal:${rule.total}`,
        kind: "subtotal",
        category: "discrepancy",
        severity: "high",
        title: `${rule.total} does not add up`,
        detail: mismatches
          .map(
            ({ cell, sum, difference }) =>
              `${cell.column ?? "Column"}: printed ${thousands(cell.value)}, but ${partsFormula(rule.parts)} ` +
              `come to ${thousands(sum)}, a difference of ${thousands(Math.abs(difference))}.`
          )
          .join(" "),
        page,
        box: total.box,
        evidence: mismatches.flatMap(({ cell, sum }) => [
          {
            label: `${rule.total} as printed${cell.column ? `, ${cell.column}` : ""}`,
            value: thousands(cell.value),
            page,
            box: cell.box
          },
          { label: `Sum of ${partsFormula(rule.parts)}`, value: thousands(sum), page: null, box: null }
        ]),
        impact:
          "The page contradicts itself, so at least one figure on it is wrong. Check whether any covenant input was read from this page.",
        checks: [...SUBTOTAL_CHECKS]
      }
    ]
  })

const isDateColumn = (column: string | null): column is string => column !== null && !Number.isNaN(Date.parse(column))

/** The current and prior cells of a row: a named column pair, or the two latest dated columns. */
const currentAndPrior = (row: TableRow): readonly [TableCell, TableCell] | null => {
  for (const [current, prior] of VARIANCE_COLUMNS) {
    const a = row.cells.find((c) => c.column === current)
    const b = row.cells.find((c) => c.column === prior)
    if (a && b) return [a, b]
  }
  const dated = row.cells
    .filter((c) => isDateColumn(c.column))
    .sort((a, b) => Date.parse(b.column ?? "") - Date.parse(a.column ?? ""))
  const [latest, previous] = dated
  return latest && previous ? [latest, previous] : null
}

const varianceFindings = (
  rows: ReadonlyArray<TableRow>,
  page: number,
  covenants: ReadonlyArray<CovenantResult>
): IssueFinding[] =>
  VARIANCE_LINES.flatMap((line) => {
    const row = rows.find((r) => sameLabel(r.label, line))
    const pair = row ? currentAndPrior(row) : null
    if (!row || !pair) return []
    const [current, prior] = pair
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
        title: `${line} ${change > 0 ? "up" : "down"} ${percent}% on the prior period`,
        detail:
          `${thousands(Math.abs(current.value))} (${current.column}) against ${thousands(Math.abs(prior.value))} ` +
          `(${prior.column}). The figures are consistent, but changes of more than ` +
          `${Math.round(VARIANCE_THRESHOLD * 100)}% need an explanation.`,
        page,
        box: row.box,
        evidence: [
          { label: prior.column ?? "Prior period", value: thousands(Math.abs(prior.value)), page, box: prior.box },
          {
            label: current.column ?? "Current period",
            value: thousands(Math.abs(current.value)),
            page,
            box: current.box
          }
        ],
        impact:
          impactOn(VARIANCE_METRICS[line], covenants) ??
          "Does not feed a covenant directly, but may signal pressure on working capital or trading.",
        checks: [...VARIANCE_CHECKS[line]]
      }
    ]
  })

const STATED_PERIOD = /(?:reporting for|month ended \d{1,2})\s+([A-Z][a-z]+ \d{4})/

const monthYear = (period: string) =>
  new Date(`${period}-01T00:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })

/** Flags a pack whose cover states a different period from the one being tested. */
const periodFindings = ({ pdf, period }: CheckInput): IssueFinding[] => {
  const match = STATED_PERIOD.exec(pdf.pages[0] ?? "")
  const stated = match?.[1]
  if (!match || !stated) return []
  const statedDate = new Date(`1 ${stated} UTC`)
  if (Number.isNaN(statedDate.getTime())) return []
  const statedPeriod = `${statedDate.getUTCFullYear()}-${String(statedDate.getUTCMonth() + 1).padStart(2, "0")}`
  if (statedPeriod === period) return []
  const box = locateQuote(pdf.layout[0] ?? [], match[0])
  return [
    {
      key: "period:p1",
      fingerprint: `period:${statedPeriod}`,
      kind: "period",
      category: "verify",
      severity: "high",
      title: `Pack is for ${stated}, not the ${monthYear(period)} period being tested`,
      detail: `The cover says "${match[0]}". Every figure in this run was read from a pack for a different period.`,
      page: 1,
      box,
      evidence: [
        { label: "Period stated in the pack", value: stated, page: 1, box },
        { label: "Period being tested", value: monthYear(period), page: null, box: null }
      ],
      impact: "Covenants are tested against the wrong period's figures until this is resolved.",
      checks: [...PERIOD_CHECKS]
    }
  ]
}

/**
 * Runs the post-extraction checks: a pack for the wrong period, certificate
 * claims that disagree with the tested results, subtotals that do not add up,
 * and large swings against the prior period. Findings are ordered as they
 * appear in the document.
 */
export const computeIssues = (input: CheckInput): IssueFinding[] => {
  const tableFindings = input.pdf.layout.flatMap((items, index) => {
    const rows = readTableRows(items)
    return [...subtotalFindings(rows, index + 1), ...varianceFindings(rows, index + 1, input.covenants)]
  })
  return [...periodFindings(input), ...tableFindings, ...certificateFindings(input)].sort(
    (a, b) => a.page - b.page || (a.box?.y ?? 0) - (b.box?.y ?? 0)
  )
}

/** Checks a run once its covenants are tested and stores what it finds for the analyst to review. */
export const runChecks = (runId: RunId, pdf: PdfText, actor: string) =>
  Effect.gen(function* () {
    const run = yield* getRunSummary(runId)
    const [covenants, claims] = yield* Effect.all([getCovenantResults(runId), listCertificateClaims(runId)])
    const findings = computeIssues({ pdf, period: run.period, covenants, claims })
    yield* recordIssues(runId, run.borrowerId, findings, actor)
    return findings
  })
