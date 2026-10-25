import { LIMIT_WORDS } from "#constants/covenants"
import type { CovenantResult, Metric } from "#types/covenants"
import type { TableRow } from "#types/pdf"
import { formatMetricValue } from "#utils/format"
import { canonicalText } from "#utils/text"

/** Whether two table labels are the same line, ignoring spacing, dashes and case. */
export const sameLabel = (a: string, b: string): boolean => canonicalText(a) === canonicalText(b)

/** Formats an amount in $'000, e.g. `$1,540k` or `−$1,253k`. */
export const formatThousandsAmount = (value: number): string =>
  `${value < 0 ? "−" : ""}$${Math.round(Math.abs(value)).toLocaleString("en-AU")}k`

/** Formats an amount in $'000 as millions, e.g. `$1.31m`. */
export const formatMillionsAmount = (value: number): string => `$${(Math.abs(value) / 1000).toFixed(2)}m`

/** A printed amount in $'000, whatever unit its table uses. */
export const inThousands = (row: TableRow, value: number): number => (value * row.scale) / 1000

export const complianceWord = (complies: boolean): string => (complies ? "complies" : "does not comply")

/** A covenant value as an analyst would say it: `4.06x` or `$1.54m`. */
export const spokenValue = (metric: Metric, value: number): string =>
  metric === "minimum_liquidity" ? `$${(value / 1_000_000).toFixed(2)}m` : formatMetricValue(metric, value)

/** `2.7% headroom`, or `over the limit by 8.3%` once breached. */
export const describeHeadroom = (result: CovenantResult): string =>
  result.headroom < 0
    ? `over the limit by ${(Math.abs(result.headroom) * 100).toFixed(1)}%`
    : `${(result.headroom * 100).toFixed(1)}% headroom`

/** `Minimum liquidity $1.54m against a $1.50m minimum (2.7% headroom, watch)`. */
export const describeCovenant = (result: CovenantResult): string =>
  `${result.name} ${spokenValue(result.metric, result.actual)} against a ` +
  `${spokenValue(result.metric, result.limit)} ${LIMIT_WORDS[result.operator]} ` +
  `(${describeHeadroom(result)}${result.status === "pass" || result.headroom < 0 ? "" : `, ${result.status}`})`

/** Why a movement matters, through the covenants the line feeds; null when it feeds none. */
export const describeImpact = (
  metrics: ReadonlyArray<Metric>,
  covenants: ReadonlyArray<CovenantResult>
): string | null => {
  const affected = covenants.filter((c) => metrics.includes(c.metric))
  if (affected.length === 0) return null
  return `Feeds ${affected.length === 1 ? "a covenant" : `${affected.length} covenants`}: ${affected
    .map(describeCovenant)
    .join("; ")}.`
}
