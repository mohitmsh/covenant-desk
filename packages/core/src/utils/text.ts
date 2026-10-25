import { DAY_MONTH_PATTERN, SHORT_MONTH_NAMES } from "#constants/dates"

/**
 * Normalises text for comparison: removes all whitespace, folds typographic
 * dashes and quotes to ASCII, and lowercases.
 */
export const canonicalText = (text: string): string =>
  text
    .normalize("NFKC")
    .replace(/[‐-―−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, "")
    .toLowerCase()

/** Counts ASCII letters in a string. */
export const countLetters = (text: string): number => (text.match(/[a-z]/gi) ?? []).length

/** Day-and-month dates in some text, keyed `30/6`, so `30 June` and `30 Jun` are the same date. */
export const datesIn = (text: string): Map<string, string> =>
  new Map(
    [...text.matchAll(DAY_MONTH_PATTERN)].map((match) => {
      const month = SHORT_MONTH_NAMES.findIndex((name) => name === match[2]) + 1
      return [`${Number(match[1])}/${month}`, match[0]]
    })
  )
