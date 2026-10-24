import { NUMBER_MATCH_TOLERANCE } from "#constants/figures"

const FINANCIAL_NUMBER = /\(?-?\$?\d[\d,]*(?:\.\d+)?\)?/g

/**
 * Parses numbers in the formats used by financial statements:
 * `7,940`, `3.41`, `(1,310)`, `-640`, `$2.5`.
 * Bracketed values are returned as positive magnitudes.
 */
export const parseNumbers = (text: string): number[] =>
  [...text.matchAll(FINANCIAL_NUMBER)]
    .map((match) => match[0].replace(/[()$,]/g, ""))
    .filter((raw) => raw !== "" && raw !== "-")
    .map(Number)
    .filter(Number.isFinite)

/** Compares magnitudes, ignoring sign. */
export const sameMagnitude = (a: number, b: number): boolean =>
  Math.abs(Math.abs(a) - Math.abs(b)) < NUMBER_MATCH_TOLERANCE
