import { PERIOD_CHECKS, STATED_PERIOD_PATTERN } from "#constants/issues"
import type { CheckInput, IssueFinding } from "#types/issues"
import { locateQuote } from "#utils/layout"

const monthYear = (period: string) =>
  new Date(`${period}-01T00:00:00Z`).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" })

/** Flags a pack whose cover states a different period from the one being tested. */
export const periodFindings = ({ pdf, period }: CheckInput): IssueFinding[] => {
  const match = STATED_PERIOD_PATTERN.exec(pdf.pages[0] ?? "")
  const stated = match?.[1]
  if (!match || !stated) return []
  const statedDate = new Date(`1 ${stated} UTC`)
  if (Number.isNaN(statedDate.getTime())) return []
  const statedPeriod = `${statedDate.getUTCFullYear()}-${String(statedDate.getUTCMonth() + 1).padStart(2, "0")}`
  if (statedPeriod === period) return []
  const box = locateQuote(pdf.layout[0] ?? [], match[0])
  return [
    {
      key: "period:p1",
      fingerprint: `period:${statedPeriod}`,
      kind: "period",
      category: "verify",
      severity: "high",
      title: `Pack is for ${stated}, not the ${monthYear(period)} period being tested`,
      detail: `The cover says "${match[0]}". Every figure in this run was read from a pack for a different period.`,
      page: 1,
      box,
      evidence: [
        { label: "Period stated in the pack", value: stated, page: 1, box },
        { label: "Period being tested", value: monthYear(period), page: null, box: null }
      ],
      impact: "Covenants are tested against the wrong period's figures until this is resolved.",
      checks: [...PERIOD_CHECKS]
    }
  ]
}
