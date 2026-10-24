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
