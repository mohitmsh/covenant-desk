import { canonicalText } from "@covenant-desk/core/text"

/** A positioned run of text from a PDF page. */
export interface TextRun {
  readonly text: string
  /** PDF-space rectangle: `[x1, y1, x2, y2]`. */
  readonly rect: readonly [number, number, number, number]
}

/**
 * Finds the text runs covering `quote` on a page, using the same whitespace-insensitive
 * comparison as server-side verification.
 */
export const findQuoteRuns = (runs: ReadonlyArray<TextRun>, quote: string): TextRun[] => {
  const target = canonicalText(quote)
  if (target.length === 0) return []

  const owners: number[] = []
  let haystack = ""
  runs.forEach((run, index) => {
    const text = canonicalText(run.text)
    haystack += text
    for (let i = 0; i < text.length; i++) owners.push(index)
  })

  const start = haystack.indexOf(target)
  if (start === -1) return []
  const first = owners[start] ?? 0
  const last = owners[start + target.length - 1] ?? first
  return runs.slice(first, last + 1).filter((run) => canonicalText(run.text).length > 0)
}

const digitsOnly = (text: string): string => text.replace(/[^\d.]/g, "")

/** Whether a text run is the printed form of `reported`, e.g. `(1,720)` for `1720`. */
export const isReportedValue = (run: TextRun, reported: number): boolean =>
  digitsOnly(run.text) !== "" && Number(digitsOnly(run.text)) === Math.abs(reported)
