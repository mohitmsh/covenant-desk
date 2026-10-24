/**
 * Returns the text on a page from the first occurrence of `label` through the
 * next occurrence of `value`, e.g. `EBITDA 304 349 931 3,880`.
 */
export const quoteFromPage = (pageText: string, label: string, value: string): string | null => {
  const start = pageText.indexOf(label)
  if (start === -1) return null
  const valueStart = pageText.indexOf(value, start + label.length)
  return valueStart === -1 ? null : pageText.slice(start, valueStart + value.length)
}
