/** Formats an amount in thousands as printed in the pack, e.g. `7,940`, or `(1,310)` when negative. */
export const formatThousands = (value: number, negative = false): string => {
  const digits = Math.round(Math.abs(value)).toLocaleString("en-AU")
  return negative ? `(${digits})` : digits
}
