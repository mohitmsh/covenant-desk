import { METRIC_DEFINITIONS } from "@covenant-desk/core/constants"
import { DATE_LOCALE } from "@/constants"
import type { Metric } from "@/types"

const MILLION = 1_000_000
const THOUSAND = 1_000
const TEN_MILLION = 10 * MILLION

const dollars = new Intl.NumberFormat(DATE_LOCALE, { style: "currency", currency: "AUD", maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat(DATE_LOCALE, { dateStyle: "medium", timeStyle: "short" })
const monthYear = new Intl.DateTimeFormat(DATE_LOCALE, { month: "long", year: "numeric", timeZone: "UTC" })

export const formatDollars = (value: number): string => dollars.format(value)

/** Formats dollars as lenders write them: `$16.4m`, `$1.54m`, `$640k`. */
export const formatCompactDollars = (value: number): string => {
  const sign = value < 0 ? "-" : ""
  const magnitude = Math.abs(value)
  if (magnitude >= TEN_MILLION) return `${sign}$${(magnitude / MILLION).toFixed(1)}m`
  if (magnitude >= MILLION) return `${sign}$${(magnitude / MILLION).toFixed(2)}m`
  return `${sign}$${Math.round(magnitude / THOUSAND)}k`
}

export const formatRatio = (value: number): string => `${value.toFixed(2)}×`

/** Formats a fraction as a percentage, e.g. `-8.3%`. */
export const formatPercent = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`

export const formatMetric = (metric: Metric, value: number): string =>
  METRIC_DEFINITIONS[metric].unit === "ratio" ? formatRatio(value) : formatCompactDollars(value)

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso))

/** Formats a `YYYY-MM` period, e.g. `September 2026`. */
export const formatPeriod = (period: string): string => monthYear.format(new Date(`${period}-01T00:00:00Z`))

/** Formats a source page reference, e.g. `p. 3`. */
export const formatPage = (page: number): string => `p. ${page}`

/** Initials for an avatar, e.g. `AM` for Amelia Moreau. */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
