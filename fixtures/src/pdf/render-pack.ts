import { createWriteStream } from "node:fs"
import { CERTIFICATE_LABELS, COMPARATIVE_BALANCE_SHEET, LENDER, THOUSAND } from "#constants"
import type { PackSpec, ProfitAndLossColumn } from "#types"
import {
  balanceSheetColumn,
  certificateLines,
  profitAndLossColumns,
  totalDebt,
  undrawnFacility
} from "#utils/financials"
import { formatThousands as fmt } from "#utils/format"
import { PackLayout, type TableRow } from "#pdf/layout"

const complianceStatus = (complies: boolean) => (complies ? "Complies" : "Does not comply")

/** Renders a six-page monthly reporting pack to `path`. */
export const renderPack = (spec: PackSpec, path: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const layout = new PackLayout(
      spec.borrower.name,
      spec.periodLabel,
      `${spec.borrower.name} — ${spec.periodLabel} reporting pack`
    )
    const stream = createWriteStream(path)
    layout.doc.pipe(stream)
    stream.on("finish", resolve).on("error", reject)

    renderCover(layout, spec)
    renderCommentary(layout, spec)
    renderProfitAndLoss(layout, spec)
    renderBalanceSheet(layout, spec)
    renderDebtSchedule(layout, spec)
    renderComplianceCertificate(layout, spec)

    layout.footer()
    layout.doc.end()
  })

const renderCover = (layout: PackLayout, spec: PackSpec) => {
  layout.header("Monthly reporting pack")
  layout.paragraph(`To: Portfolio Monitoring, ${LENDER}`)
  layout.paragraph(`Re: ${spec.borrower.facilityName} — reporting for ${spec.periodLabel}`)
  layout.paragraph(
    "Please find enclosed our management accounts for the month ended 30 September 2026, together with the debt schedule and compliance certificate required under the facility agreement."
  )
  layout.paragraph(
    "The pack contains: management commentary (page 2), profit and loss (page 3), balance sheet (page 4), debt and liquidity schedule (page 5) and compliance certificate (page 6). All figures are unaudited and presented in Australian dollars, thousands."
  )
  layout.paragraph(`Kind regards,\n${spec.cfo}\nChief Financial Officer, ${spec.borrower.name}`)
}

const renderCommentary = (layout: PackLayout, spec: PackSpec) => {
  layout.newPage("Management commentary")
  layout.paragraph(`Sector: ${spec.sector}`)
  spec.commentary.forEach((text) => layout.paragraph(text))
}

const renderProfitAndLoss = (layout: PackLayout, spec: PackSpec) => {
  layout.newPage("Profit and loss")
  layout.paragraph("Year to date is July to September 2026. TTM is the twelve months to 30 September 2026.")

  const p = profitAndLossColumns(spec)
  const columns = [p.month, p.budget, p.yearToDate, p.ttm, p.priorTtm]
  const row = (
    label: string,
    key: keyof ProfitAndLossColumn,
    options: { negative?: boolean; total?: boolean } = {}
  ): TableRow => ({
    cells: [label, ...columns.map((column) => fmt(column[key], options.negative))],
    bold: options.total ?? false,
    rule: options.total ?? false
  })

  layout.table(
    [
      { label: "Sep-26 Actual", width: 68 },
      { label: "Sep-26 Budget", width: 68 },
      { label: "YTD Actual", width: 64 },
      { label: "TTM Actual", width: 64 },
      { label: "Prior TTM", width: 64 }
    ],
    [
      row("Revenue", "revenue"),
      row("Cost of sales", "cogs", { negative: true }),
      row("Gross profit", "grossProfit", { total: true }),
      row("Operating expenses", "opex", { negative: true }),
      row("EBITDA", "ebitda", { total: true }),
      row("Depreciation and amortisation", "da", { negative: true }),
      row("EBIT", "ebit", { total: true }),
      row("Interest expense", "interest", { negative: true }),
      row("Net profit before tax", "npbt", { total: true })
    ]
  )
}

const renderBalanceSheet = (layout: PackLayout, spec: PackSpec) => {
  layout.newPage("Balance sheet")
  const current = balanceSheetColumn(spec, spec.cash, spec.rcfDrawn, 1)
  const prior = balanceSheetColumn(
    spec,
    spec.cashLastQuarter,
    spec.rcfDrawn - COMPARATIVE_BALANCE_SHEET.rcfReduction,
    COMPARATIVE_BALANCE_SHEET.drift
  )
  const printed = (key: keyof typeof current) => current[key] + (spec.misprint?.row === key ? spec.misprint.delta : 0)
  const row = (label: string, key: keyof typeof current, total = false): TableRow => ({
    cells: [label, fmt(printed(key)), fmt(prior[key])],
    bold: total,
    rule: total
  })

  layout.table(
    [
      { label: "30 Sep 2026", width: 90 },
      { label: "30 Jun 2026", width: 90 }
    ],
    [
      row("Cash at bank", "cash"),
      row("Trade receivables", "receivables"),
      row("Inventories", "inventory"),
      row("Property, plant and equipment", "ppe"),
      row("Right-of-use assets", "rightOfUse"),
      row("Total assets", "totalAssets", true),
      row("Trade payables", "payables"),
      row("Borrowings – current", "borrowingsCurrent"),
      row("Borrowings – non-current", "borrowingsNonCurrent"),
      row("Lease liabilities", "leases"),
      row("Total liabilities", "totalLiabilities", true),
      row("Net assets", "netAssets", true)
    ]
  )
  layout.paragraph("Lease liabilities are excluded from Total Debt as defined in the facility agreement.")
}

const renderDebtSchedule = (layout: PackLayout, spec: PackSpec) => {
  layout.newPage("Debt and liquidity schedule")
  const undrawn = undrawnFacility(spec)

  layout.table(
    [
      { label: "Limit", width: 80 },
      { label: "Drawn", width: 80 },
      { label: "Undrawn", width: 80 }
    ],
    [
      { cells: ["Senior term loan", fmt(spec.termLoan), fmt(spec.termLoan), "–"] },
      { cells: ["Revolving credit facility", fmt(spec.rcfLimit), fmt(spec.rcfDrawn), fmt(undrawn)] },
      {
        cells: ["Total debt", fmt(spec.termLoan + spec.rcfLimit), fmt(totalDebt(spec)), fmt(undrawn)],
        bold: true,
        rule: true
      }
    ]
  )
  layout.doc.moveDown(0.5)
  layout.table(
    [{ label: "30 Sep 2026", width: 90 }],
    [
      { cells: ["Cash at bank", fmt(spec.cash)] },
      { cells: ["Undrawn revolving credit facility", fmt(undrawn)] },
      { cells: ["Total available liquidity", fmt(spec.cash + undrawn)], bold: true, rule: true }
    ]
  )
}

const CERTIFICATE_REQUIREMENT_PREFIX = { lte: "max", gte: "min" } as const

const renderComplianceCertificate = (layout: PackLayout, spec: PackSpec) => {
  layout.newPage("Compliance certificate")
  layout.paragraph(
    `We refer to the facility agreement between ${spec.borrower.name} and ${LENDER}. We confirm that, for the Test Period ending 30 September 2026:`
  )
  if (spec.certificateEbitda) {
    layout.paragraph(
      `EBITDA used below of ${fmt(spec.certificateEbitda.value)} is stated after adding back ${spec.certificateEbitda.addBacks}.`
    )
  }

  const rows: TableRow[] = certificateLines(spec).map((line) => {
    const covenant = spec.covenants.find((c) => c.metric === line.metric)
    const isRatio = line.scale === 1
    const limit = covenant ? (isRatio ? `${covenant.limit.toFixed(2)}x` : fmt(covenant.limit / THOUSAND)) : "–"
    return {
      cells: [
        CERTIFICATE_LABELS[line.metric],
        isRatio ? `${line.printed}x` : line.printed,
        `${covenant ? CERTIFICATE_REQUIREMENT_PREFIX[covenant.operator] : ""} ${limit}`,
        complianceStatus(line.claimsCompliance)
      ]
    }
  })
  layout.table(
    [
      { label: "Actual", width: 80 },
      { label: "Requirement", width: 90 },
      { label: "Status", width: 80 }
    ],
    rows
  )
  layout.paragraph("We confirm that no Default is continuing.")
  layout.paragraph(
    `Signed for and on behalf of ${spec.borrower.name}\n\n${spec.cfo}, Chief Financial Officer\n14 October 2026`
  )
}
