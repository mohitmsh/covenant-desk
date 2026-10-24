/**
 * Formats an amount in thousands as printed in the pack, e.g. `7,940`, or `(1,310)` when negative.
 * `negative` marks a row presented as a deduction, such as a cost, so a positive amount is bracketed.
 */
export const formatThousands = (value: number, negative = false): string => {
  const digits = Math.round(Math.abs(value)).toLocaleString("en-AU")
  return negative !== value < 0 ? `(${digits})` : digits
}
