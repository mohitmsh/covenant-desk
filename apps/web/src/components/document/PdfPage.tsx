import type { PDFDocumentProxy } from "pdfjs-dist"
import { useEffect, useRef, useState } from "react"
import { PDF_RENDER_SCALE_MAX } from "@/constants"
import { findQuoteRuns, isReportedValue, type TextRun } from "@/utils/text-layer"
import styles from "./PdfPage.module.css"

interface PdfPageProps {
  readonly pdf: PDFDocumentProxy
  readonly pageNumber: number
  readonly width: number
  readonly quote: string | null
  readonly reported: number | null
}

interface Highlight {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
  /** The run holding the reported number, as opposed to the rest of the quoted row. */
  readonly primary: boolean
}

const HIGHLIGHT_PADDING = 2

/** Renders one PDF page at the given CSS width and highlights `quote` when present. */
export function PdfPage({ pdf, pageNumber, width, quote, reported }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const primaryRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)
  const [highlights, setHighlights] = useState<ReadonlyArray<Highlight>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || width === 0) return
    let cancelled = false
    let cancelRender = () => {}

    const render = async () => {
      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width })
      const pixelRatio = Math.min(window.devicePixelRatio, PDF_RENDER_SCALE_MAX)
      canvas.width = Math.floor(viewport.width * pixelRatio)
      canvas.height = Math.floor(viewport.height * pixelRatio)
      setHeight(viewport.height)

      const task = page.render({
        canvas,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0]
      })
      cancelRender = () => task.cancel()
      await task.promise.catch(() => undefined)

      const content = await page.getTextContent()
      const runs: TextRun[] = content.items.flatMap((item) =>
        "str" in item
          ? [
              {
                text: item.str,
                rect: [
                  item.transform[4],
                  item.transform[5],
                  item.transform[4] + item.width,
                  item.transform[5] + item.height
                ] as const
              }
            ]
          : []
      )
      if (cancelled) return

      const matched = quote ? findQuoteRuns(runs, quote) : []
      const primaryIndex = reported === null ? -1 : matched.findLastIndex((run) => isReportedValue(run, reported))
      setHighlights(
        matched.map((run, index) => {
          const [x1 = 0, y1 = 0]: number[] = viewport.convertToViewportPoint(run.rect[0], run.rect[1])
          const [x2 = 0, y2 = 0]: number[] = viewport.convertToViewportPoint(run.rect[2], run.rect[3])
          return {
            left: Math.min(x1, x2) - HIGHLIGHT_PADDING,
            top: Math.min(y1, y2) - HIGHLIGHT_PADDING,
            width: Math.abs(x2 - x1) + HIGHLIGHT_PADDING * 2,
            height: Math.abs(y2 - y1) + HIGHLIGHT_PADDING * 2,
            primary: index === primaryIndex
          }
        })
      )
    }

    void render()
    return () => {
      cancelled = true
      cancelRender()
    }
  }, [pdf, pageNumber, width, quote, reported])

  useEffect(() => {
    if (highlights.length > 0) primaryRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [highlights])

  return (
    <div className={styles.page} style={{ width, height }}>
      <canvas ref={canvasRef} className={styles.canvas} style={{ width, height }} />
      {highlights.map((highlight) => (
        <div
          key={`${highlight.left}-${highlight.top}`}
          ref={highlight.primary ? primaryRef : undefined}
          className={styles.highlight}
          data-primary={highlight.primary}
          style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height }}
        />
      ))}
    </div>
  )
}
