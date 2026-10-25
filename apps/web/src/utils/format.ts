import { METRIC_DEFINITIONS } from "@covenant-desk/core/constants"
import { COMPANY_SUFFIX_PATTERN, DATE_LOCALE } from "@/constants"
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

const monthYearShort = new Intl.DateTimeFormat(DATE_LOCALE, { month: "short", year: "numeric", timeZone: "UTC" })
const time = new Intl.DateTimeFormat(DATE_LOCALE, { hour: "numeric", minute: "2-digit" })

/** Formats a `YYYY-MM` period briefly, e.g. `Sep 2026`. */
export const formatShortPeriod = (period: string): string =>
  monthYearShort.format(new Date(`${period}-01T00:00:00Z`)).replace("Sept", "Sep")

/** A borrower's name without its company suffix: `Corella Fresh Foods Pty Ltd` → `Corella Fresh Foods`. */
export const formatBorrowerName = (name: string): string => name.replace(COMPANY_SUFFIX_PATTERN, "")

/** `9:10 pm` for today, otherwise `25 Oct 2026, 9:10 pm`. */
export const formatRecentTime = (iso: string): string =>
  new Date(iso).toDateString() === new Date().toDateString() ? time.format(new Date(iso)) : formatDateTime(iso)

/** Whole dollars in thousands: `$470k`. */
export const formatThousands = (value: number): string =>
  `$${Math.round(Math.abs(value) / THOUSAND).toLocaleString(DATE_LOCALE)}k`

/** Whole dollars as the pack prints them in $'000: `4,350`. */
export const formatPrintedThousands = (value: number): string =>
  Math.round(value / THOUSAND).toLocaleString(DATE_LOCALE)

export { formatUsd } from "@covenant-desk/core/format"
