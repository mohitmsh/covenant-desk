import type { VerificationError } from "@covenant-desk/core"

/** Explains a verification failure in terms the model can act on. */
export const describeRejection = (error: VerificationError): string => {
  switch (error._tag) {
    case "PageOutOfRange":
      return `Page ${error.page} does not exist; the document has ${error.pageCount} pages.`
    case "QuoteTooVague":
      return "The quote must include the row label, not just the number."
    case "QuoteNotFound":
      return error.foundOnPages.length > 0
        ? `The quote is not on page ${error.page}. It appears on page ${error.foundOnPages.join(", ")}.`
        : `The quote does not appear on page ${error.page}. Copy the text exactly as printed.`
    case "ValueNotInQuote":
      return `The reported number ${error.reported} is not in the quote. Numbers in the quote: ${error.numbersInQuote.join(", ")}.`
  }
}
