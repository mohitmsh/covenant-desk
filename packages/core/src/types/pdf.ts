/** A rectangle on a page as fractions of the page size, origin top-left, so it scales with any rendering. */
export interface PageBox {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** A run of text from a page's text layer and where it sits. */
export interface PositionedText {
  readonly text: string
  readonly box: PageBox
}

export interface PdfText {
  readonly sha256: string
  /** Text of each page; index 0 is page 1. */
  readonly pages: ReadonlyArray<string>
  /** Positioned text of each page, in content order; index 0 is page 1. */
  readonly layout: ReadonlyArray<ReadonlyArray<PositionedText>>
}

export interface TableCell {
  readonly value: number
  readonly box: PageBox
  /** Header of the column the cell sits under, matched by right edge. */
  readonly column: string | null
}

/** A labelled row of amounts, as financial statements print them. */
export interface TableRow {
  readonly label: string
  readonly cells: ReadonlyArray<TableCell>
  readonly box: PageBox
  /** Whole dollars per printed unit, from the table's heading: 1,000 for `$'000`, 1,000,000 for `$m`. */
  readonly scale: number
  /** Smallest printed step, in printed units: 1 for `$'000`, 0.01 for `$m` to two decimals. */
  readonly precision: number
}
