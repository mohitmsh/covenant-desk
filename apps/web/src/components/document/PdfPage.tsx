import type { PDFDocumentProxy } from "pdfjs-dist"
import { useEffect, useRef, useState } from "react"
import { PDF_RENDER_SCALE_MAX } from "@/constants"
import type { PageBox } from "@/types"
import type { IssueTone } from "@/utils/issues"
import { findQuoteRuns, isReportedValue, type TextRun } from "@/utils/text-layer"
import styles from "./PdfPage.module.css"

/** A numbered box drawn over the page, like a field in a signing app. */
export interface PageMarker {
  readonly key: string
  readonly number: number
  readonly label: string
  readonly box: PageBox
  readonly tone: IssueTone
  readonly active: boolean
}

/** An extracted field outlined where it was read from, like the fields in a document review tool. */
export interface PageField {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly box: PageBox
  readonly active: boolean
}

interface PdfPageProps {
  readonly pdf: PDFDocumentProxy
  readonly pageNumber: number
  readonly width: number
  readonly quote: string | null
  readonly reported: number | null
  readonly markers: ReadonlyArray<PageMarker>
  readonly onSelectMarker: (key: string) => void
  readonly fields: ReadonlyArray<PageField>
  readonly onSelectField: (key: string) => void
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

const MARKER_PADDING = 4

const FIELD_PADDING = 2

/** Renders one PDF page at the given CSS width and highlights `quote` when present. */
export function PdfPage({
  pdf,
  pageNumber,
  width,
  quote,
  reported,
  markers,
  onSelectMarker,
  fields,
  onSelectField
}: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const primaryRef = useRef<HTMLDivElement>(null)
  const activeMarkerRef = useRef<HTMLButtonElement>(null)
  const activeMarker = markers.find((marker) => marker.active)?.key ?? null
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

  useEffect(() => {
    if (activeMarker !== null && height > 0) {
      activeMarkerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
    }
  }, [activeMarker, height])

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
      {height > 0 &&
        fields.map((field) => (
          <button
            key={field.key}
            type="button"
            className={styles.field}
            data-active={field.active}
            data-label-side={field.box.x + field.box.width > 0.6 ? "end" : "start"}
            aria-label={`${field.label}: ${field.value}`}
            aria-pressed={field.active}
            onClick={() => onSelectField(field.key)}
            style={{
              left: field.box.x * width - FIELD_PADDING,
              top: field.box.y * height - FIELD_PADDING,
              width: field.box.width * width + FIELD_PADDING * 2,
              height: field.box.height * height + FIELD_PADDING * 2
            }}
          >
            <span className={styles.fieldLabel}>
              {field.label} <span className={styles.fieldValue}>{field.value}</span>
            </span>
          </button>
        ))}
      {height > 0 &&
        markers.map((marker) => (
          <button
            key={marker.key}
            type="button"
            ref={marker.active ? activeMarkerRef : undefined}
            className={styles.marker}
            data-tone={marker.tone}
            data-active={marker.active}
            aria-label={`Issue ${marker.number}: ${marker.label}`}
            aria-pressed={marker.active}
            onClick={() => onSelectMarker(marker.key)}
            style={{
              left: marker.box.x * width - MARKER_PADDING,
              top: marker.box.y * height - MARKER_PADDING,
              width: marker.box.width * width + MARKER_PADDING * 2,
              height: marker.box.height * height + MARKER_PADDING * 2
            }}
          >
            <span className={styles.markerTag}>{marker.number}</span>
          </button>
        ))}
    </div>
  )
}
