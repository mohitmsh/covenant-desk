import { createRequire } from "node:module"
import { dirname } from "node:path"
import { Effect } from "effect"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { PdfUnreadable } from "#errors/pdf"
import type { PdfText } from "#types/pdf"
import { toError } from "#utils/errors"
import { sha256 } from "#utils/hash"

const STANDARD_FONT_DATA_URL = `${dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"))}/standard_fonts/`

/** Extracts the text of each page, in reading order, and hashes the file. */
export const readPdfText = (bytes: Uint8Array) =>
  Effect.tryPromise({
    try: async (): Promise<PdfText> => {
      const task = getDocument({
        data: new Uint8Array(bytes),
        useSystemFonts: false,
        standardFontDataUrl: STANDARD_FONT_DATA_URL
      })
      const doc = await task.promise
      const pages: string[] = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const content = await (await doc.getPage(pageNumber)).getTextContent()
        pages.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        )
      }
      await task.destroy()
      return { sha256: sha256(bytes), pages }
    },
    catch: (cause) => new PdfUnreadable({ cause: toError(cause) })
  })
