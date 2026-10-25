import type { PageBox, PositionedText } from "#types/pdf"
import { canonicalText } from "#utils/text"

/** Items whose vertical centres are within this fraction of the page height share a line. */
const SAME_LINE_TOLERANCE = 0.004

/** Right edges within this fraction of the page width belong to the same column. */
const SAME_COLUMN_TOLERANCE = 0.006

const PRINTED_AMOUNT = /^\(?-?[\d,]+(?:\.\d+)?\)?$/

const NIL_AMOUNT = /^[–—-]$/

/** The smallest box containing every box given, or null when there are none. */
export const unionBox = (boxes: ReadonlyArray<PageBox>): PageBox | null => {
  if (boxes.length === 0) return null
  const left = Math.min(...boxes.map((b) => b.x))
  const top = Math.min(...boxes.map((b) => b.y))
  const right = Math.max(...boxes.map((b) => b.x + b.width))
  const bottom = Math.max(...boxes.map((b) => b.y + b.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Box around the text items covering `quote`, matched ignoring whitespace like server-side verification.
 * With `reported`, the box is narrowed to the item printing that number, e.g. `(1,720)` for 1720,
 * so a figure is outlined on its own cell rather than the whole row.
 */
export const locateQuote = (items: ReadonlyArray<PositionedText>, quote: string, reported?: number): PageBox | null => {
  const target = canonicalText(quote)
  if (target.length === 0) return null

  const owners: number[] = []
  let haystack = ""
  items.forEach((item, index) => {
    const text = canonicalText(item.text)
    haystack += text
    for (let i = 0; i < text.length; i++) owners.push(index)
  })

  const start = haystack.indexOf(target)
  if (start === -1) return null
  const first = owners[start] ?? 0
  const last = owners[start + target.length - 1] ?? first
  const matched = items.slice(first, last + 1)
  const valueItem =
    reported === undefined
      ? undefined
      : matched.findLast((item) => {
          const amount = parseAmount(item.text.replace(/[x×]$/i, ""))
          return amount !== null && Math.abs(Math.abs(amount) - Math.abs(reported)) < 1e-9
        })
  return valueItem ? valueItem.box : unionBox(matched.map((item) => item.box))
}

/** Parses a printed amount: `1,310` → 1310, `(1,310)` → −1310, `–` → 0. Null when not an amount. */
export const parseAmount = (text: string): number | null => {
  const trimmed = text.trim()
  if (NIL_AMOUNT.test(trimmed)) return 0
  if (!PRINTED_AMOUNT.test(trimmed)) return null
  const magnitude = Number(trimmed.replace(/[(),]/g, ""))
  return trimmed.startsWith("(") ? -Math.abs(magnitude) : magnitude
}

export interface TableCell {
  readonly value: number
  readonly box: PageBox
  /** Header of the column the cell sits under, matched by right edge. */
  readonly column: string | null
}

/** A labelled row of amounts, as financial statements print them. */
export interface TableRow {
  readonly label: string
  readonly cells: ReadonlyArray<TableCell>
  readonly box: PageBox
  /** Whole dollars per printed unit, from the table's heading: 1,000 for `$'000`, 1,000,000 for `$m`. */
  readonly scale: number
  /** Smallest printed step, in printed units: 1 for `$'000`, 0.01 for `$m` to two decimals. */
  readonly precision: number
}

/** Reads a table's unit from its heading, e.g. `$'000` or `$m`. Defaults to thousands, as packs usually print. */
const unitOf = (heading: string): { readonly scale: number; readonly precision: number } =>
  /\$\s*m\b|millions/i.test(heading) ? { scale: 1_000_000, precision: 0.01 } : { scale: 1_000, precision: 1 }

const rightEdge = (box: PageBox) => box.x + box.width

const groupLines = (items: ReadonlyArray<PositionedText>): PositionedText[][] => {
  const lines: PositionedText[][] = []
  const sorted = [...items].sort((a, b) => a.box.y + a.box.height / 2 - (b.box.y + b.box.height / 2))
  for (const item of sorted) {
    const centre = item.box.y + item.box.height / 2
    const line = lines.at(-1)
    const lineCentre = line?.[0] ? line[0].box.y + line[0].box.height / 2 : Number.NaN
    if (line && Math.abs(centre - lineCentre) <= SAME_LINE_TOLERANCE) line.push(item)
    else lines.push([item])
  }
  return lines.map((line) => line.sort((a, b) => a.box.x - b.box.x))
}

/**
 * Reads the rows of every table on a page: a text label followed by amounts.
 * Each amount is assigned to the nearest header above it whose right edge it shares.
 */
export const readTableRows = (items: ReadonlyArray<PositionedText>): TableRow[] => {
  const rows: TableRow[] = []
  let headers: PositionedText[] = []
  let unit = unitOf("")

  for (const line of groupLines(items)) {
    const amounts = line.filter((item) => parseAmount(item.text) !== null)
    const labelItems = line.filter((item) => parseAmount(item.text) === null)
    const isHeader = amounts.length === 0 && labelItems.length > 1
    if (isHeader) {
      headers = labelItems.slice(1)
      unit = unitOf(labelItems[0]?.text ?? "")
      continue
    }
    if (amounts.length === 0 || labelItems.length === 0) continue

    const box = unionBox(line.map((item) => item.box))
    if (!box) continue
    rows.push({
      ...unit,
      label: labelItems.map((item) => item.text.trim()).join(" "),
      cells: amounts.map((item) => ({
        value: parseAmount(item.text) ?? 0,
        box: item.box,
        column:
          headers
            .find((header) => Math.abs(rightEdge(header.box) - rightEdge(item.box)) <= SAME_COLUMN_TOLERANCE)
            ?.text.trim() ?? null
      })),
      box
    })
  }
  return rows
}
