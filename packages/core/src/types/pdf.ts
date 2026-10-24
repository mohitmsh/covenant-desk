export interface PdfText {
  readonly sha256: string
  /** Text of each page; index 0 is page 1. */
  readonly pages: ReadonlyArray<string>
}
