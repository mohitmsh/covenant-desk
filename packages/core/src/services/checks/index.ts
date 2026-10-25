import { Effect } from "effect"
import { ISSUE_CATEGORY_ORDER, ISSUE_SEVERITY_ORDER } from "#constants/issues"
import { listCertificateClaims } from "#repositories/certificate-claims"
import { getCovenantResults } from "#repositories/covenant-results"
import { recordIssues } from "#repositories/issues"
import { getRunSummary } from "#repositories/runs"
import type { RunId } from "#types/ids"
import type { CheckInput, IssueFinding } from "#types/issues"
import type { PdfText } from "#types/pdf"
import { readTableRows } from "#utils/layout"
import { certificateFindings } from "./certificate"
import { conflictFindings } from "./conflict"
import { periodFindings } from "./period"
import { subtotalFindings } from "./subtotal"
import { varianceFindings } from "./variance"

/**
 * Runs the post-extraction checks: a pack for the wrong period, certificate
 * claims that disagree with the tested results, subtotals that do not add up,
 * and large swings against the prior period. Findings are ordered worst first:
 * discrepancies before anything needing explanation or verification, then by
 * where they appear in the document.
 */
export const computeIssues = (input: CheckInput): IssueFinding[] => {
  const rowsByPage = input.pdf.layout.map((items) => readTableRows(items))
  const tableFindings = [
    ...conflictFindings(rowsByPage),
    ...rowsByPage.flatMap((rows, index) => [
      ...subtotalFindings(rows, index + 1),
      ...varianceFindings(rows, index + 1, input.covenants)
    ])
  ]
  return [...periodFindings(input), ...tableFindings, ...certificateFindings(input)].sort(
    (a, b) =>
      ISSUE_CATEGORY_ORDER[a.category] - ISSUE_CATEGORY_ORDER[b.category] ||
      ISSUE_SEVERITY_ORDER[a.severity] - ISSUE_SEVERITY_ORDER[b.severity] ||
      a.page - b.page ||
      (a.box?.y ?? 0) - (b.box?.y ?? 0)
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
