import { CONFLICT_CHECKS } from "#constants/issues"
import type { IssueFinding } from "#types/issues"
import type { TableRow } from "#types/pdf"
import { formatThousandsAmount, inThousands, sameLabel } from "#utils/issue-text"
import { canonicalText } from "#utils/text"

/**
 * Flags a line printed on more than one page with different amounts for the
 * same date, such as cash on the balance sheet and on the debt schedule.
 */
export const conflictFindings = (rowsByPage: ReadonlyArray<ReadonlyArray<TableRow>>): IssueFinding[] => {
  const occurrences = rowsByPage.flatMap((rows, index) => rows.map((row) => ({ row, page: index + 1 })))
  const findings: IssueFinding[] = []
  const reported = new Set<string>()
  for (const [i, a] of occurrences.entries()) {
    for (const b of occurrences.slice(i + 1)) {
      if (a.page === b.page || !sameLabel(a.row.label, b.row.label) || reported.has(canonicalText(a.row.label)))
        continue
      for (const cellA of a.row.cells) {
        const cellB = b.row.cells.find((cell) => cell.column !== null && cell.column === cellA.column)
        if (!cellB) continue
        const valueA = inThousands(a.row, cellA.value)
        const valueB = inThousands(b.row, cellB.value)
        const tolerance = Math.max(inThousands(a.row, a.row.precision), inThousands(b.row, b.row.precision))
        if (Math.abs(valueA - valueB) <= tolerance) continue
        reported.add(canonicalText(a.row.label))
        findings.push({
          key: `conflict:${a.row.label}`,
          fingerprint: `conflict:${a.row.label}`,
          kind: "conflict",
          category: "discrepancy",
          severity: "high",
          title: `${a.row.label} differs between page ${a.page} and page ${b.page}`,
          detail:
            `${cellA.column}: ${formatThousandsAmount(valueA)} on page ${a.page} but ${formatThousandsAmount(valueB)} on page ${b.page}. ` +
            "The pack contradicts itself, so any figure read from either page needs confirming.",
          page: a.page,
          box: cellA.box,
          evidence: [
            {
              label: `Page ${a.page}, ${cellA.column}`,
              value: formatThousandsAmount(valueA),
              page: a.page,
              box: cellA.box
            },
            {
              label: `Page ${b.page}, ${cellB.column}`,
              value: formatThousandsAmount(valueB),
              page: b.page,
              box: cellB.box
            }
          ],
          impact: "The agent can only have used one of these figures, so the covenants may be tested on the wrong one.",
          checks: [...CONFLICT_CHECKS]
        })
        break
      }
    }
  }
  return findings
}
