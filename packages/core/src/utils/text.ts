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
