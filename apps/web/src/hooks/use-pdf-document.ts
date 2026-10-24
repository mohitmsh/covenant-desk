import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { useEffect, useState } from "react"

GlobalWorkerOptions.workerSrc = workerUrl

type PdfState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly pdf: PDFDocumentProxy }
  | { readonly status: "error"; readonly message: string }

/** Loads a PDF from a URL and releases it when the URL changes or the component unmounts. */
export const usePdfDocument = (url: string): PdfState => {
  const [state, setState] = useState<PdfState>({ status: "loading" })

  useEffect(() => {
    let active = true
    setState({ status: "loading" })
    const task = getDocument({ url })
    task.promise.then(
      (pdf) => active && setState({ status: "ready", pdf }),
      (error: Error) => active && setState({ status: "error", message: error.message })
    )
    return () => {
      active = false
      void task.destroy()
    }
  }, [url])

  return state
}
