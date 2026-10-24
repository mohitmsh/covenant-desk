import { Effect } from "effect"
import {
  SUBTOTAL_RULES,
  SUBTOTAL_TOLERANCE,
  VARIANCE_COLUMNS,
  VARIANCE_LINES,
  VARIANCE_THRESHOLD
} from "#constants/issues"
import { listCertificateClaims } from "#repositories/certificate-claims"
import { getCovenantResults } from "#repositories/covenant-results"
import { recordIssues } from "#repositories/issues"
import { getRunSummary } from "#repositories/runs"
import { compareCertificates } from "#services/certificate"
import type { VerifiedCertificateClaim } from "#types/certificate"
import type { CovenantResult } from "#types/covenants"
import type { RunId } from "#types/ids"
import type { IssueFinding } from "#types/issues"
import type { PdfText } from "#types/pdf"
import { formatMetricValue } from "#utils/format"
import { readTableRows, type TableCell, type TableRow } from "#utils/layout"
import { canonicalText } from "#utils/text"

export interface CheckInput {
  readonly pdf: PdfText
  readonly covenants: ReadonlyArray<CovenantResult>
  readonly claims: ReadonlyArray<VerifiedCertificateClaim>
}

const sameLabel = (a: string, b: string) => canonicalText(a) === canonicalText(b)

/** Formats an amount printed in $'000, e.g. `$1,540k` or `−$1,253k`. */
const thousands = (value: number) => `${value < 0 ? "−" : ""}$${Math.round(Math.abs(value)).toLocaleString("en-AU")}k`

const complianceWord = (complies: boolean) => (complies ? "complies" : "does not comply")

const certificateFindings = ({ covenants, claims }: CheckInput): IssueFinding[] =>
  compareCertificates(covenants, claims).flatMap((comparison) => {
    if (comparison.disagreements.length === 0) return []
    const claim = claims.find((c) => c.metric === comparison.metric)
    const covenant = covenants.find((c) => c.metric === comparison.metric)
    if (!claim || !covenant) return []
    const name = covenant.name.toLowerCase()
    const compliance = comparison.disagreements.includes("compliance")
    return [
      {
        key: `certificate:${comparison.metric}`,
        fingerprint: `certificate:${comparison.metric}:${comparison.disagreements.join("+")}`,
        kind: "certificate_mismatch",
        severity: compliance ? "high" : "medium",
        title: compliance
          ? `Certificate says ${name} complies; tested result is a breach`
          : `Certificate reports a different ${name}`,
        detail:
          `The certificate states ${formatMetricValue(comparison.metric, comparison.certificateValue)} ` +
          `(${complianceWord(comparison.claimsCompliance)}). Tested from the verified figures: ` +
          `${formatMetricValue(comparison.metric, comparison.testedValue)} (${comparison.testedStatus}).`,
        page: claim.page,
        box: claim.box
      }
    ]
  })

/** The part cell in the same column as `cell`, by header when both have one, otherwise by position. */
const cellInColumn = (row: TableRow, cell: TableCell, index: number): TableCell | undefined =>
  cell.column !== null && row.cells.some((c) => c.column !== null)
    ? row.cells.find((c) => c.column === cell.column)
    : row.cells[index]

/** `revenue + cost of sales`, `total assets − total liabilities`. */
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
        box: total.box
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

const varianceFindings = (rows: ReadonlyArray<TableRow>, page: number): IssueFinding[] =>
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
        severity: "medium",
        title: `${line} ${change > 0 ? "up" : "down"} ${percent}% on the prior period`,
        detail:
          `${thousands(Math.abs(current.value))} (${current.column}) against ${thousands(Math.abs(prior.value))} ` +
          `(${prior.column}). ` +
          `Changes of more than ${Math.round(VARIANCE_THRESHOLD * 100)}% are flagged for review.`,
        page,
        box: row.box
      }
    ]
  })

/**
 * Runs the post-extraction checks: certificate claims that disagree with the
 * tested results, subtotals that do not add up, and large swings against the
 * prior period. Findings are ordered as they appear in the document.
 */
export const computeIssues = (input: CheckInput): IssueFinding[] => {
  const tableFindings = input.pdf.layout.flatMap((items, index) => {
    const rows = readTableRows(items)
    return [...subtotalFindings(rows, index + 1), ...varianceFindings(rows, index + 1)]
  })
  return [...tableFindings, ...certificateFindings(input)].sort(
    (a, b) => a.page - b.page || (a.box?.y ?? 0) - (b.box?.y ?? 0)
  )
}

/** Checks a run once its covenants are tested and stores what it finds for the analyst to review. */
export const runChecks = (runId: RunId, pdf: PdfText, actor: string) =>
  Effect.gen(function* () {
    const run = yield* getRunSummary(runId)
    const [covenants, claims] = yield* Effect.all([getCovenantResults(runId), listCertificateClaims(runId)])
    const findings = computeIssues({ pdf, covenants, claims })
    yield* recordIssues(runId, run.borrowerId, findings, actor)
    return findings
  })
