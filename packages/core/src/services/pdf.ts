import { createRequire } from "node:module"
import { dirname } from "node:path"
import { Effect } from "effect"
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs"
import { PdfUnreadable } from "#errors/pdf"
import type { PdfText, PositionedText } from "#types/pdf"
import { toError } from "#utils/errors"
import { sha256 } from "#utils/hash"

const STANDARD_FONT_DATA_URL = `${dirname(createRequire(import.meta.url).resolve("pdfjs-dist/package.json"))}/standard_fonts/`

/** Extracts the text of each page, in reading order, with positions, and hashes the file. */
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
      const layout: PositionedText[][] = []
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber)
        const { width, height } = page.getViewport({ scale: 1 })
        const content = await page.getTextContent()
        layout.push(
          content.items.flatMap((item) => {
            if (!("str" in item) || item.str.trim() === "") return []
            const [, , , fontSize = 0, x = 0, baseline = 0] = item.transform
            const itemHeight = item.height || Math.abs(fontSize)
            return [
              {
                text: item.str,
                box: {
                  x: x / width,
                  y: (height - baseline - itemHeight) / height,
                  width: item.width / width,
                  height: itemHeight / height
                }
              }
            ]
          })
        )
        pages.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        )
      }
      await task.destroy()
      return { sha256: sha256(bytes), pages, layout }
    },
    catch: (cause) => new PdfUnreadable({ cause: toError(cause) })
  })
