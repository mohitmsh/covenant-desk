import { useRef } from "react"
import { PDF_PAGE_GUTTER } from "@/constants"
import { useElementWidth } from "@/hooks/use-element-width"
import { usePdfDocument } from "@/hooks/use-pdf-document"
import type { DocumentRecord, SourceFocus } from "@/types"
import { Button } from "@/components/ui/Button"
import { Message } from "@/components/ui/Message"
import { PdfPage } from "./PdfPage"
import styles from "./DocumentViewer.module.css"

interface DocumentViewerProps {
  readonly url: string
  readonly document: DocumentRecord
  readonly focus: SourceFocus
  readonly onPageChange: (page: number) => void
}

export function DocumentViewer({ url, document, focus, onPageChange }: DocumentViewerProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const bodyWidth = useElementWidth(bodyRef)
  const state = usePdfDocument(url)
  const pageWidth = Math.max(0, bodyWidth - PDF_PAGE_GUTTER * 2)

  return (
    <div className={styles.viewer}>
      <div className={styles.toolbar}>
        <span className={styles.filename} title={document.filename}>
          {document.filename}
        </span>
        <span className={styles.sha} title={`SHA-256 ${document.sha256}`}>
          {document.sha256.slice(0, 8)}
        </span>
        <div className={styles.pager}>
          <Button
            variant="ghost"
            aria-label="Previous page"
            disabled={focus.page <= 1}
            onClick={() => onPageChange(focus.page - 1)}
          >
            ←
          </Button>
          <span className="tabular">
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
          />
        )}
      </div>

      {focus.quote && (
        <div className={styles.caption}>
          <span className={styles.captionLabel}>Verified to source</span>
          <q className={styles.quote}>{focus.quote}</q>
        </div>
      )}
    </div>
  )
}
