import PDFDocument from "pdfkit"
import { PACK_PAGE_COUNT } from "#constants"

const MARGIN = 56
const HEADER_Y = 40
const RULE_Y = 56
const TITLE_Y = 76
const FOOTER_OFFSET = 48

export interface TableColumn {
  readonly label: string
  readonly width: number
}

export interface TableRow {
  readonly cells: ReadonlyArray<string>
  readonly bold?: boolean
  /** Draws a rule above the row's figures. */
  readonly rule?: boolean
}

/** Page layout for a borrower reporting pack: running header, footer, paragraphs and tables. */
export class PackLayout {
  readonly doc: PDFKit.PDFDocument
  readonly contentWidth: number
  private pageNumber = 1

  constructor(
    private readonly companyName: string,
    private readonly periodLabel: string,
    title: string
  ) {
    this.doc = new PDFDocument({ size: "A4", margin: MARGIN, info: { Title: title } })
    this.contentWidth = this.doc.page.width - 2 * MARGIN
  }

  header(title: string): void {
    const { doc } = this
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#333")
      .text(this.companyName.toUpperCase(), MARGIN, HEADER_Y, { width: this.contentWidth })
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#666")
      .text(`Monthly reporting pack · ${this.periodLabel}`, MARGIN, HEADER_Y, {
        width: this.contentWidth,
        align: "right"
      })
    doc
      .moveTo(MARGIN, RULE_Y)
      .lineTo(MARGIN + this.contentWidth, RULE_Y)
      .lineWidth(0.5)
      .strokeColor("#999")
      .stroke()
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#000").text(title, MARGIN, TITLE_Y)
    doc.moveDown(0.6)
  }

  footer(): void {
    const { doc } = this
    doc.page.margins.bottom = 0
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#888")
      .text(`Page ${this.pageNumber} of ${PACK_PAGE_COUNT}`, MARGIN, doc.page.height - FOOTER_OFFSET, {
        width: this.contentWidth,
        align: "center",
        lineBreak: false
      })
  }

  newPage(title: string): void {
    this.footer()
    this.doc.addPage()
    this.pageNumber++
    this.header(title)
  }

  paragraph(text: string): void {
    this.doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor("#111")
      .text(text, MARGIN, this.doc.y, { width: this.contentWidth, lineGap: 3 })
    this.doc.moveDown(0.8)
  }

  /** Draws a table in $'000 with a left-aligned label column and right-aligned figures. */
  table(columns: ReadonlyArray<TableColumn>, rows: ReadonlyArray<TableRow>): void {
    const { doc } = this
    const labelWidth = this.contentWidth - columns.reduce((sum, column) => sum + column.width, 0)
    let y = doc.y + 4

    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#444").text("$'000", MARGIN, y, { width: labelWidth })
    let x = MARGIN + labelWidth
    for (const column of columns) {
      doc.text(column.label, x, y, { width: column.width, align: "right" })
      x += column.width
    }
    y += 22
    doc
      .moveTo(MARGIN, y - 6)
      .lineTo(MARGIN + this.contentWidth, y - 6)
      .lineWidth(0.5)
      .strokeColor("#bbb")
      .stroke()

    for (const row of rows) {
      if (row.rule) {
        doc
          .moveTo(MARGIN + labelWidth, y - 3)
          .lineTo(MARGIN + this.contentWidth, y - 3)
          .lineWidth(0.4)
          .strokeColor("#ccc")
          .stroke()
      }
      doc
        .font(row.bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9.5)
        .fillColor("#000")
      const [label = "", ...values] = row.cells
      doc.text(label, MARGIN, y, { width: labelWidth })
      x = MARGIN + labelWidth
      values.forEach((value, index) => {
        const width = columns[index]?.width ?? 0
        doc.text(value, x, y, { width, align: "right" })
        x += width
      })
      y += row.bold ? 20 : 17
    }

    doc.y = y + 6
    doc.x = MARGIN
  }
}
