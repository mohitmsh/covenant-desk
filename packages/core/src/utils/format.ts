import { METRIC_DEFINITIONS } from "#constants/covenants"
import type { Metric } from "#types/covenants"

/** Formats whole dollars, e.g. `$1,540,000`. */
export const formatDollars = (value: number): string => `$${Math.round(value).toLocaleString("en-AU")}`

/** Formats a ratio to two decimal places, e.g. `3.41x`. */
export const formatRatio = (value: number): string => `${value.toFixed(2)}x`

/** Formats a metric value in its unit. */
export const formatMetricValue = (metric: Metric, value: number): string =>
  METRIC_DEFINITIONS[metric].unit === "ratio" ? formatRatio(value) : formatDollars(value)
