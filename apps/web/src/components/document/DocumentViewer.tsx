import { useRef, useState, type ReactNode } from "react"
import { PDF_FIT_ZOOM, PDF_PAGE_GUTTER, PDF_ZOOM_LEVELS } from "@/constants"
import { useElementWidth } from "@/hooks/use-element-width"
import { usePdfDocument } from "@/hooks/use-pdf-document"
import type { DocumentRecord, OnPage, PageField, PageMarker, SourceFocus } from "@/types"
import { Button } from "@/components/ui/Button"
import { Message } from "@/components/ui/Message"
import { PdfPage } from "./PdfPage"
import { SourceSnippet } from "./SourceSnippet"
import styles from "./DocumentViewer.module.css"

interface DocumentViewerProps {
  readonly url: string
  readonly document: DocumentRecord
  readonly focus: SourceFocus
  readonly onPageChange: (page: number) => void
  /** Issue boxes for every page; only the current page's are drawn. */
  readonly markers: ReadonlyArray<OnPage<PageMarker>>
  readonly onSelectMarker: (key: string) => void
  /** Extracted fields for every page; only the current page's are drawn. */
  readonly fields: ReadonlyArray<OnPage<PageField>>
  readonly onSelectField: (key: string) => void
  /** Docked below the page in place of the source caption, e.g. the issue being reviewed. */
  readonly footer?: ReactNode
}

export function DocumentViewer({
  url,
  document,
  focus,
  onPageChange,
  markers,
  onSelectMarker,
  fields,
  onSelectField,
  footer
}: DocumentViewerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyWidth = useElementWidth(bodyRef)
  const state = usePdfDocument(url)
  const [zoom, setZoom] = useState<number>(PDF_FIT_ZOOM)
  const pageWidth = Math.max(0, bodyWidth - PDF_PAGE_GUTTER * 2) * zoom
  const zoomIndex = PDF_ZOOM_LEVELS.findIndex((level) => level === zoom)
  const pageFields = fields.filter((field) => field.page === focus.page)

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <div className={styles.file}>
          <span className={styles.filename} title={document.filename}>
            {document.filename}
          </span>
          <span className={styles.sha} title={`SHA-256 ${document.sha256}`}>
            {document.sha256.slice(0, 8)}
          </span>
        </div>

        <div className={styles.controls}>
          <div className={styles.group}>
            <Button
              variant="ghost"
              aria-label="Previous page"
              disabled={focus.page <= 1}
              onClick={() => onPageChange(focus.page - 1)}
            >
              ←
            </Button>
            <span className={`${styles.readout} tabular`}>
              {focus.page} / {document.pageCount}
            </span>
            <Button
              variant="ghost"
              aria-label="Next page"
              disabled={focus.page >= document.pageCount}
              onClick={() => onPageChange(focus.page + 1)}
            >
              →
            </Button>
          </div>

          <div className={styles.group}>
            <Button
              variant="ghost"
              aria-label="Zoom out"
              disabled={zoomIndex <= 0}
              onClick={() => setZoom(PDF_ZOOM_LEVELS[zoomIndex - 1] ?? zoom)}
            >
              −
            </Button>
            <button
              type="button"
              className={`${styles.readout} ${styles.zoomReset} tabular`}
              title="Fit to width"
              onClick={() => setZoom(PDF_FIT_ZOOM)}
            >
              {Math.round(zoom * 100)}%
            </button>
            <Button
              variant="ghost"
              aria-label="Zoom in"
              disabled={zoomIndex >= PDF_ZOOM_LEVELS.length - 1}
              onClick={() => setZoom(PDF_ZOOM_LEVELS[zoomIndex + 1] ?? zoom)}
            >
              +
            </Button>
          </div>

          <a className={styles.download} href={url} download={document.filename} aria-label="Download PDF">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M7 2v7M4 6.5 7 9.5l3-3M2.5 12h9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </div>

      <div ref={bodyRef} className={styles.body}>
        {state.status === "loading" && <Message title="Loading document" />}
        {state.status === "error" && (
          <Message title="Document could not be opened" tone="error">
            {state.message}
          </Message>
        )}
        {state.status === "ready" && pageWidth > 0 && (
          <PdfPage
            pdf={state.pdf}
            pageNumber={focus.page}
            width={pageWidth}
            quote={focus.quote}
            reported={focus.reported}
            spotlight={focus.quote === null ? focus.box : null}
            markers={markers.filter((marker) => marker.page === focus.page)}
            onSelectMarker={onSelectMarker}
            fields={pageFields}
            onSelectField={onSelectField}
          />
        )}
      </div>

      {footer ??
        (focus.quote ? (
          <div className={styles.caption}>
            <div className={styles.captionHeader}>
              <span className={styles.captionLabel}>✓ Verified to source</span>
              <span className={styles.captionPage}>Page {focus.page}</span>
            </div>
            {state.status === "ready" && focus.box && (
              <div className={styles.snippet}>
                <SourceSnippet pdf={state.pdf} page={focus.page} box={focus.box} />
              </div>
            )}
            <q className={styles.quote}>{focus.quote}</q>
          </div>
        ) : (
          pageFields.length > 0 && (
            <div className={styles.hint}>
              {pageFields.length} extracted {pageFields.length === 1 ? "field" : "fields"} on this page. Click one to
              see its source.
            </div>
          )
        ))}
    </div>
  )
}
