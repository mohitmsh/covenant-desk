/** Date wording for a reporting period, given as `YYYY-MM`. Financial years start in July. */
export interface PeriodDates {
  /** `September 2026` */
  readonly label: string
  /** `30 September 2026` */
  readonly monthEnd: string
  /** `30 Sep 2026` */
  readonly monthEndShort: string
  /** `30 Jun 2026`: the end of the month three months earlier, for comparative balance sheets. */
  readonly priorQuarterEndShort: string
  /** `July to September 2026` */
  readonly yearToDate: string
  /** `Sep-26` */
  readonly monthColumn: string
  /** `14 October 2026`: when the certificate is signed. */
  readonly signed: string
}

const CERTIFICATE_SIGNED_DAY = 14

/** Abbreviations as the packs print them; locales disagree (`Sept`, `June`). */
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const

const shortMonth = (date: Date) => SHORT_MONTHS[date.getUTCMonth()] ?? ""

const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString("en-AU", { ...options, timeZone: "UTC" })

const monthEndOf = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0))

export const periodDates = (period: string): PeriodDates => {
  const [year = 0, month = 1] = period.split("-").map(Number)
  const monthIndex = month - 1
  const end = monthEndOf(year, monthIndex)
  const priorQuarterEnd = monthEndOf(year, monthIndex - 3)
  const financialYearStart = new Date(Date.UTC(monthIndex >= 6 ? year : year - 1, 6, 1))
  const signed = new Date(Date.UTC(year, monthIndex + 1, CERTIFICATE_SIGNED_DAY))
  const short = (date: Date) => `${date.getUTCDate()} ${shortMonth(date)} ${date.getUTCFullYear()}`
  return {
    label: format(end, { month: "long", year: "numeric" }),
    monthEnd: format(end, { day: "numeric", month: "long", year: "numeric" }),
    monthEndShort: short(end),
    priorQuarterEndShort: short(priorQuarterEnd),
    yearToDate: `${format(financialYearStart, { month: "long" })} to ${format(end, { month: "long", year: "numeric" })}`,
    monthColumn: `${shortMonth(end)}-${String(year).slice(2)}`,
    signed: format(signed, { day: "numeric", month: "long", year: "numeric" })
  }
}
