import { SUBTOTAL_CHECKS, SUBTOTAL_RULES, SUBTOTAL_TOLERANCE } from "#constants/issues"
import type { IssueFinding } from "#types/issues"
import type { TableCell, TableRow } from "#types/pdf"
import { formatThousandsAmount, inThousands, sameLabel } from "#utils/issue-text"

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

/** Subtotals on a page that do not equal the sum of their lines. */
export const subtotalFindings = (rows: ReadonlyArray<TableRow>, page: number): IssueFinding[] =>
  SUBTOTAL_RULES.flatMap((rule) => {
    const total = rows.find((row) => sameLabel(row.label, rule.total))
    const parts = rule.parts.map(([label, sign]) => ({ row: rows.find((row) => sameLabel(row.label, label)), sign }))
    if (!total || parts.some((part) => part.row === undefined)) return []

    const mismatches = total.cells.flatMap((cell, index) => {
      const cells = parts.map((part) => (part.row ? cellInColumn(part.row, cell, index) : undefined))
      if (cells.some((c) => c === undefined)) return []
      const sum = cells.reduce((acc, c, i) => acc + (c?.value ?? 0) * (parts[i]?.sign ?? 1), 0)
      const difference = cell.value - sum
      // Each printed figure is rounded, so allow a step of rounding for every couple of lines summed.
      const tolerance = SUBTOTAL_TOLERANCE * total.precision * Math.max(1, Math.ceil(parts.length / 2))
      return Math.abs(difference) > tolerance ? [{ cell, sum, difference }] : []
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
              `${cell.column ?? "Column"}: printed ${formatThousandsAmount(inThousands(total, cell.value))}, but ` +
              `${partsFormula(rule.parts)} come to ${formatThousandsAmount(inThousands(total, sum))}, a difference of ` +
              `${formatThousandsAmount(inThousands(total, Math.abs(difference)))}.`
          )
          .join(" "),
        page,
        box: total.box,
        evidence: mismatches.flatMap(({ cell, sum }) => [
          {
            label: `${rule.total} as printed${cell.column ? `, ${cell.column}` : ""}`,
            value: formatThousandsAmount(inThousands(total, cell.value)),
            page,
            box: cell.box
          },
          {
            label: `Sum of ${partsFormula(rule.parts)}`,
            value: formatThousandsAmount(inThousands(total, sum)),
            page: null,
            box: null
          }
        ]),
        impact:
          "The page contradicts itself, so at least one figure on it is wrong. Check whether any covenant input was read from this page.",
        checks: [...SUBTOTAL_CHECKS]
      }
    ]
  })
