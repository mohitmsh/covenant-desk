/**
 * Formats an amount in thousands as printed in the pack, e.g. `7,940`, or `(1,310)` when negative.
 * `negative` marks a row presented as a deduction, such as a cost, so a positive amount is bracketed.
 */
export const formatThousands = (value: number, negative = false): string => {
  const digits = Math.round(Math.abs(value)).toLocaleString("en-AU")
  return negative !== value < 0 ? `(${digits})` : digits
}

/** Formats an amount held in thousands as $ millions to two decimals, e.g. `16.40`, or `(1.25)` when negative. */
export const formatMillions = (value: number, negative = false): string => {
  const digits = (Math.abs(value) / 1000).toFixed(2)
  return negative !== value < 0 ? `(${digits})` : digits
}
